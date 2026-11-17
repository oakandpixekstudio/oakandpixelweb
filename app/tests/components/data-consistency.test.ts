import { describe, expect, it } from "vitest";
import { clients, emails, invoices, opportunities, projects, tasks } from "@/_mocks/data";

describe("shared demonstration data", () => {
  it("keeps every related record attached to a known entity", () => {
    const clientIds = new Set(clients.map(client => client.id));
    const projectIds = new Set(projects.map(project => project.id));
    expect(projects.every(project => clientIds.has(project.clientId))).toBe(true);
    expect(opportunities.every(opportunity => clientIds.has(opportunity.clientId))).toBe(true);
    expect(tasks.every(task => projectIds.has(task.projectId))).toBe(true);
    expect(emails.every(email => clientIds.has(email.clientId))).toBe(true);
    expect(invoices.every(invoice => clientIds.has(invoice.clientId))).toBe(true);
  });

  it("keeps percentages and invoice values valid", () => {
    expect(projects.every(project => project.progress >= 0 && project.progress <= 100)).toBe(true);
    expect(tasks.every(task => task.progress >= 0 && task.progress <= 100)).toBe(true);
    expect(invoices.every(invoice => invoice.items.every(item => item.quantity > 0 && item.unitPrice >= 0))).toBe(true);
  });
});
