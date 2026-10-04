import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";

export const metadata: Metadata = { title: "Apply for a wholesale account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Apply for a wholesale account</h1>
      <p className="mt-1 text-sm text-muted">
        Tell us about your business. We review each application before enabling wholesale prices and ordering.
      </p>

      <div className="mt-5">
        <Notice tone="warning">Applications are not accepted online yet. This form is a layout preview and submits nothing.</Notice>
      </div>

      <form className="mt-5">
        <fieldset disabled className="space-y-4">
          <legend className="sr-only">Business details</legend>
          <Field id="companyName" label="Company name" required>
            <Input id="companyName" name="companyName" autoComplete="organization" />
          </Field>
          <Field id="businessType" label="Business type" required>
            <Select id="businessType" name="businessType" defaultValue="">
              <option value="" disabled>Select…</option>
              <option>Restaurant</option>
              <option>Grocery store</option>
              <option>Caterer</option>
              <option>Other</option>
            </Select>
          </Field>
          <Field id="contactName" label="Contact name" required>
            <Input id="contactName" name="contactName" autoComplete="name" />
          </Field>
          <Field id="regEmail" label="Email" required>
            <Input id="regEmail" name="email" type="email" autoComplete="email" />
          </Field>
          <Field id="phone" label="Phone" required>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" />
          </Field>
          <Field id="postalCode" label="Postal code" hint="e.g. 160-0000">
            <Input id="postalCode" name="postalCode" autoComplete="postal-code" inputMode="numeric" />
          </Field>
          <Button type="submit" className="w-full">Submit application (not available yet)</Button>
        </fieldset>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already approved?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">Log in</Link>
      </p>
    </>
  );
}
