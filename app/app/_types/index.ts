export type ClientStatus = "Active" | "Proposal" | "Discovery" | "On Hold";
export type ProjectStage = "Backlog" | "To Do" | "In Progress" | "In Review" | "Completed";
export type OpportunityStage = "Lead" | "Qualified" | "Proposal" | "Negotiation" | "Won";
export type TaskStatus = "To Do" | "In Progress" | "In Review" | "Completed";

export interface Client {
  id: string; name: string; initials: string; service: string; status: ClientStatus;
  contact: string; email: string; phone: string; industry: string; pipeline: number; billed: number;
}
export interface Project {
  id: string; name: string; clientId: string; service: string; stage: ProjectStage; progress: number;
  due: string; manager: string; description: string;
}
export interface Opportunity {
  id: string; clientId: string; name: string; service: string; stage: OpportunityStage; value: number; owner: string;
}
export interface Task {
  id: string; title: string; projectId: string; assignee: string; priority: "Low" | "Medium" | "High";
  status: TaskStatus; due: string; progress: number; description: string;
}
export interface EmailMessage {
  id: string; clientId: string; projectId?: string; folder: string; from: string; subject: string; preview: string;
  body: string; time: string; unread?: boolean; starred?: boolean; attachments?: string[];
}
export interface Template { id: string; name: string; type: string; service: string; updated: string; body: string; }
export interface InvoiceItem { description: string; quantity: number; unitPrice: number; }
export interface Invoice {
  id: string; clientId: string; projectId?: string; status: "Draft" | "Sent" | "Paid" | "Overdue";
  issueDate: string; dueDate: string; taxRate: number; items: InvoiceItem[]; paid: number;
}
