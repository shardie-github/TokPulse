// Global type definitions

// SVG imports
declare module '*.svg' {
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

// Image imports
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.webp' {
  const value: string;
  export default value;
}

// CSS modules
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.module.scss' {
  const classes: Record<string, string>;
  export default classes;
}

// JSON imports
declare module '*.json' {
  const value: any;
  export default value;
}

// Environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'test' | 'production';
      DATABASE_URL?: string;
      API_BASE_URL?: string;
      NEXT_PUBLIC_API_BASE?: string;
      JWT_SECRET?: string;
      STRIPE_SECRET_KEY?: string;
      SHOPIFY_API_SECRET?: string;
      SHOPIFY_API_KEY?: string;
      SENTRY_DSN?: string;
      ENABLE_ANALYTICS?: string;
      ENABLE_TELEMETRY?: string;
    }
  }
}

export {};