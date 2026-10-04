"use client";

import { useState, useTransition } from "react";
import { adjustOrderItemAction } from "@/app/admin/orders/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { formatMoney, formatWeight } from "@/lib/format";
import { isValidAmount, toGrams, type TaxRates } from "@/lib/orders/calc";
import { previewOrderAdjustment } from "@/lib/orders/assemble";
import type { Order } from "@/lib/types";
import type { FieldErrors, OrderItem, Weight } from "@/lib/types";

interface AdjustItemProps {
  orderId: string;
  item: OrderItem;
  index: number;
  /** Current order (items, shipping, refunds, tax snapshot) for the live before/after preview. */
  order: Pick<Order, "items" | "shipping" | "refunds" | "taxSnapshot">;
  /** Placeholder class rates for older orders without a tax snapshot. */
  taxRates: TaxRates;
}

/**
 * Order-level change to one line's fulfilled weight and/or agreed unit price.
 * Never touches the catalog product. The preview uses the same pure calculator
 * as the server; the server recalculates and records the audit entry on save.
 */
export function AdjustItemButton({ orderId, item, index, order, taxRates }: AdjustItemProps) {
  const current = item.fulfilledWeight ?? item.orderedWeight;
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(String(item.unitPrice));
  const [weightValue, setWeightValue] = useState(String(current.value));
  const [weightUnit, setWeightUnit] = useState<Weight["unit"]>(current.unit);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const p = `adj-${item.id}`;

  const reset = () => {
    setPrice(String(item.unitPrice));
    setWeightValue(String(current.value));
    setWeightUnit(current.unit);
    setReason("");
    setErrors({});
    setMessage("");
  };

  const priceNum = price.trim() === "" ? Number.NaN : Number(price);
  const weightNum = weightValue.trim() === "" ? Number.NaN : Number(weightValue);
  const priceOk = isValidAmount(priceNum);
  const weightOk = Number.isFinite(weightNum) && weightNum > 0;
  const newWeight: Weight = { value: weightNum, unit: weightUnit };
  const priceChanged = priceOk && priceNum !== item.unitPrice;
  const weightChanged = weightOk && toGrams(newWeight) !== toGrams(current);
  const preview =
    priceOk && weightOk && (priceChanged || weightChanged)
      ? previewOrderAdjustment(order, index, { unitPrice: priceNum, fulfilledWeight: newWeight }, taxRates)
      : undefined;

  const save = () =>
    startTransition(async () => {
      setMessage("");
      const result = await adjustOrderItemAction(orderId, {
        itemId: item.id,
        // Send only what changed (invalid input is sent so the server reports it).
        unitPrice: !priceOk || priceChanged ? priceNum : undefined,
        fulfilledWeight: !weightOk || weightChanged ? newWeight : undefined,
        reason,
      });
      if (result.ok) {
        setOpen(false);
        reset();
      } else {
        setErrors(result.errors);
        setMessage(result.message);
      }
    });

  const err = (key: string) => errors[key];
  const describedBy = (key: string, hint = true) => (err(key) ? `${p}-${key}-error` : hint ? `${p}-${key}-hint` : undefined);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} aria-label={`Adjust ${item.name}`}>
        Adjust
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title={`Adjust ${item.name}`}
        description={
          <>
            Changes this order only — the catalog price and product weight stay the same.
            {item.attributes && <span className="block">{Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(", ")}</span>}
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`${p}-unitPrice`}
              label={`Agreed unit price (per ${item.unitLabel})`}
              hint={`Catalog ${formatMoney(item.catalogUnitPrice)} · now ${formatMoney(item.unitPrice)}`}
              error={err("unitPrice")}
            >
              <Input
                id={`${p}-unitPrice`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-invalid={Boolean(err("unitPrice"))}
                aria-describedby={describedBy("unitPrice")}
              />
            </Field>
            <div className="space-y-1.5">
              <label htmlFor={`${p}-fulfilledWeight`} className="block text-sm font-medium">Fulfilled weight</label>
              <div className="flex gap-2">
                <Input
                  id={`${p}-fulfilledWeight`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.001"
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                  aria-invalid={Boolean(err("fulfilledWeight"))}
                  aria-describedby={describedBy("fulfilledWeight")}
                />
                <Select aria-label="Weight unit" value={weightUnit} onChange={(e) => setWeightUnit(e.target.value as Weight["unit"])} className="w-20">
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                </Select>
              </div>
              {err("fulfilledWeight") ? (
                <p id={`${p}-fulfilledWeight-error`} className="text-xs text-danger">{err("fulfilledWeight")}</p>
              ) : (
                <p id={`${p}-fulfilledWeight-hint`} className="text-xs text-muted">
                  Ordered {formatWeight(item.orderedWeight)}.{" "}
                  {item.pricedByWeight ? "Priced by weight — the line amount follows this weight." : "Fixed-price item — weight is recorded but does not change the price."}
                </p>
              )}
            </div>
          </div>

          <Field id={`${p}-reason`} label="Reason" required hint="Required. Kept in the order's audit history." error={err("reason")}>
            <Textarea
              id={`${p}-reason`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              placeholder="e.g. Packed weight 10.4 kg on scale #2"
              aria-invalid={Boolean(err("reason"))}
              aria-describedby={describedBy("reason")}
            />
          </Field>

          <section aria-labelledby={`${p}-preview`} className="rounded-ui border border-line bg-surface-muted p-3 text-sm">
            <h3 id={`${p}-preview`} className="font-medium">Preview</h3>
            {preview ? (
              <dl className="mt-2 space-y-1 tabular-nums [&>div]:flex [&>div]:justify-between [&>div]:gap-4">
                <div><dt>Line total</dt><dd>{formatMoney(preview.lineBefore.total)} → <strong>{formatMoney(preview.lineAfter.total)}</strong></dd></div>
                <div><dt>Order total (incl. VAT)</dt><dd>{formatMoney(preview.totalBefore)} → <strong>{formatMoney(preview.totalAfter)}</strong></dd></div>
                <div>
                  <dt>Difference</dt>
                  <dd className={preview.difference < 0 ? "text-danger" : undefined}>{preview.difference > 0 ? "+" : ""}{formatMoney(preview.difference)}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-1 text-muted">Change the price or weight to see the new line and order totals.</p>
            )}
            <p className="mt-2 text-xs text-muted">The server recalculates and stores the final amounts when you save. Payment is not re-charged or refunded.</p>
          </section>

          <p role="alert" className="text-sm text-danger">{message}</p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save adjustment"}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
