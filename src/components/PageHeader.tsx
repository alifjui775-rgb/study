interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="gradient-text text-3xl font-bold leading-relaxed mb-2 break-words">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
}
