export class TemplateService {
  parse(template: string, data: Record<string, any>): string {
    if (!template) return "";
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }
}
