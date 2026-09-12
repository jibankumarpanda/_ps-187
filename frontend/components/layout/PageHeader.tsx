"use client";

import React from 'react';
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`space-y-6 mb-12 border-b border-border pb-8 ${className}`}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-2" />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="border-l-4 border-accent pl-6 py-2">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-tight text-foreground tracking-tighter uppercase">{title}</h1>
          {subtitle && <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-2xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}
