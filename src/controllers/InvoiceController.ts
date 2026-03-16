import { Invoice } from "../models/Invoice"

export class InvoiceController {
  createInvoice(invoice: Invoice): boolean {
    console.log("Creating invoice:", invoice)
    return true
  }

  getInvoice(id: number): Invoice | null {
    console.log(id)
    return null
  }
}