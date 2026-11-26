import * as React from "react";

type AsChildProps = { asChild?: boolean; children?: React.ReactNode };

/**
 * Lets a Base UI trigger or close part be written as `<XTrigger asChild><button/></XTrigger>`.
 * Base UI itself has no `asChild`; it takes the element through `render`, so this hands the single
 * child over as that prop. A child that is a plain tag other than `<button>` (a `<span>`, say) is
 * not a native button, so `nativeButton` is switched off for it.
 */
export function withAsChild<P extends object>(Primitive: React.ComponentType<P>, displayName: string) {
  const Wrapped = React.forwardRef<unknown, P & AsChildProps>(
    ({ asChild, children, ...props }, ref) => {
      const P = Primitive as React.ComponentType<Record<string, unknown>>;
      if (asChild && React.isValidElement(children)) {
        const nativeButton = typeof children.type !== "string" || children.type === "button";
        return <P ref={ref} {...props} render={children} {...(nativeButton ? {} : { nativeButton: false })} />;
      }
      return (
        <P ref={ref} {...props}>
          {children}
        </P>
      );
    }
  );
  Wrapped.displayName = displayName;
  return Wrapped as unknown as React.ForwardRefExoticComponent<
    Omit<React.ComponentProps<typeof Primitive>, "ref"> &
      AsChildProps &
      React.RefAttributes<HTMLElement>
  >;
}
