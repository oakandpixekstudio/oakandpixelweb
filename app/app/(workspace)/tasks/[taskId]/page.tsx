import { TaskDetailView } from "@/_features/pipeline-tasks";
export default async function Page({params}:{params:Promise<{taskId:string}>}){const{taskId}=await params;return <TaskDetailView taskId={taskId}/>}
