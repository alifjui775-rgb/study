import React from "react";

interface SimplePageHeaderProps {
  title: string;
  description: string;
}

const SimplePageHeader = ({ title, description }: SimplePageHeaderProps) => {
  return (
    <div className="text-center font-bengali mb-6">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-relaxed gradient-text animate-in fade-in duration-500">
        {title}
      </h1>
      <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">{description}</p>
    </div>
  );
};

export default SimplePageHeader;
