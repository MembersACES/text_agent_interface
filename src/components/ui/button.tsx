"use client";



import { cn } from "@/lib/utils";

import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";

import { Spinner } from "./spinner";



export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {

  variant?: "primary" | "secondary" | "ghost" | "danger";

  size?: "sm" | "default" | "lg";

  radius?: "full" | "md";

  loading?: boolean;

  leftIcon?: ReactNode;

  children: ReactNode;

}



const variantStyles = {

  primary:

    "bg-primary text-white hover:bg-primary-hover active:bg-primary-active focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-dark disabled:opacity-50",

  secondary:

    "border border-stroke bg-white text-dark hover:bg-gray-2 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-dark-2 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50",

  ghost:

    "bg-transparent text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-2 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50",

  danger:

    "bg-red text-white hover:brightness-95 active:brightness-90 focus:ring-2 focus:ring-red focus:ring-offset-2 dark:focus:ring-offset-gray-dark disabled:opacity-50",

};



const sizeStyles = {

  sm: "px-3 py-1.5 text-xs gap-1.5",

  default: "px-4 py-2 text-sm gap-2",

  lg: "px-5 py-2.5 text-base gap-2.5",

};

const radiusStyles = {

  full: "rounded-full",

  md: "rounded-md",

};



export const Button = forwardRef<HTMLButtonElement, ButtonProps>(

  (

    {

      className,

      variant = "primary",

      size = "default",

      radius = "full",

      loading = false,

      disabled,

      leftIcon,

      children,

      ...props

    },

    ref

  ) => {

    const isDisabled = disabled || loading;



    return (

      <button

        ref={ref}

        type="button"

        disabled={isDisabled}

        className={cn(

          "inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none disabled:cursor-not-allowed",

          variantStyles[variant],

          sizeStyles[size],

          radiusStyles[radius],

          className

        )}

        {...props}

      >

        {loading ? (

          <Spinner className="size-4 shrink-0" />

        ) : leftIcon ? (

          <span className="shrink-0 [&>svg]:size-4 [&>svg]:size-[1em]">

            {leftIcon}

          </span>

        ) : null}

        {children}

      </button>

    );

  }

);



Button.displayName = "Button";

