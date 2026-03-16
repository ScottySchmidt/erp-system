export class Invoice {
  invoice_id: number
  user_id: number
  account_id: number
  vendor_id: number
  total_amount: number
  voucher_date: Date
  created_date: Date

  constructor(
    invoice_id: number,
    user_id: number,
    account_id: number,
    vendor_id: number,
    total_amount: number,
    voucher_date: Date,
    created_date: Date
  ) 
  {
    this.invoice_id = invoice_id
    this.user_id = user_id
    this.account_id = account_id
    this.vendor_id = vendor_id
    this.total_amount = total_amount
    this.voucher_date = voucher_date
    this.created_date = created_date
  }

  getTotal(): number {
    return this.total_amount
  }
}