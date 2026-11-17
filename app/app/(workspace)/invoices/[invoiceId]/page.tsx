import { InvoiceDetailView } from "@/_features/business";
export default async function Page({params}:{params:Promise<{invoiceId:string}>}){const{invoiceId}=await params;return <InvoiceDetailView invoiceId={invoiceId}/>}
