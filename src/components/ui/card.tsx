"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Improved type definition with explicit props interface
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  className,
  variant = 'default',
  size = 'md',
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow transition-all",
      // Add variant styles
      variant === 'outline' && "border-2",
      variant === 'ghost' && "border-0 shadow-none",
      // Add size styles
      size === 'sm' && "p-2",
      size === 'md' && "p-4",
      size === 'lg' && "p-6",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  compact?: boolean
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(({
  className,
  compact,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5",
      compact ? "p-4" : "p-6",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  size?: 'sm' | 'md' | 'lg'
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(({
  className,
  size = 'md',
  ...props
}, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-semibold leading-none tracking-tight",
      size === 'sm' && "text-lg",
      size === 'md' && "text-xl",
      size === 'lg' && "text-2xl",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  truncate?: boolean
}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(({
  className,
  truncate,
  ...props
}, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-muted-foreground",
      truncate && "truncate",
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(({
  className,
  padding = 'md',
  ...props
}, ref) => (
  <div 
    ref={ref} 
    className={cn(
      padding === 'none' && "p-0",
      padding === 'sm' && "p-4 pt-0",
      padding === 'md' && "p-6 pt-0",
      padding === 'lg' && "p-8 pt-0",
      className
    )} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'center' | 'end' | 'between'
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(({
  className,
  justify = 'start',
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-6 pt-0",
      justify === 'center' && "justify-center",
      justify === 'end' && "justify-end",
      justify === 'between' && "justify-between",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  // Export types for external use
  type CardProps,
  type CardHeaderProps,
  type CardTitleProps,
  type CardDescriptionProps,
  type CardContentProps,
  type CardFooterProps,
}