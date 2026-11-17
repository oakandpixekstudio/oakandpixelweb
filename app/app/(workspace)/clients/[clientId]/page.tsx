import { ClientDetailView } from "@/_features/clients";
export default async function Page({params}:{params:Promise<{clientId:string}>}){const{clientId}=await params;return <ClientDetailView clientId={clientId}/>}
