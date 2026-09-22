import { ArrowUpRightFromSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import React from "react";

interface ExternalLinkProps {
  href: string;
  text: string;
  icon?: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}

const ExternalLink = ({ href, text, icon, className, showIcon = true }: ExternalLinkProps) => {
  if (!href) {
    return (
      <span className={cn("text-muted-foreground inline-flex items-center gap-1", className)}>
        {icon}
        <span dangerouslySetInnerHTML={{ __html: text }} />
      </span>
    );
  }

  const isTelegramLink = href.startsWith("https://t.me/");
  const isExternal =
    href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:");

  const handleTelegramClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isTelegramLink) return;

    e.preventDefault();
    const tgPath = href.substring("https://t.me/".length);
    const appUrl = `tg://resolve?domain=${tgPath.split("/")[0]}&post=${tgPath.split("/")[1] || ""}`;

    window.location.href = appUrl;

    setTimeout(() => {
      window.open(href, "_blank");
    }, 500);
  };

  let target: string | undefined = "_blank";
  let rel: string | undefined = "noopener noreferrer";
  const clickHandler = isTelegramLink ? handleTelegramClick : undefined;

  if (!isExternal) {
    target = undefined;
    rel = undefined;
  }

  if (isExternal) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        onClick={clickHandler}
        className={cn("text-primary hover:underline inline-flex items-center gap-1", className)}
      >
        {icon}
        <span dangerouslySetInnerHTML={{ __html: text }} />
        {showIcon && <ArrowUpRightFromSquare className="h-3 w-3" />}
      </a>
    );
  }

  return (
    <Link
      to={href}
      className={cn("text-primary hover:underline inline-flex items-center gap-1", className)}
    >
      {icon}
      <span dangerouslySetInnerHTML={{ __html: text }} />
    </Link>
  );
};

export default ExternalLink;
