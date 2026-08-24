import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      // No rodape o aviso cobria os botoes das barras fixas — e por 7s, com a
      // acao principal do comprador inacessivel embaixo dele.
      position="top-center"
      duration={4000}
      style={{ "--width": "427px" } as React.CSSProperties}
      toastOptions={{
        style: {
          fontSize: "1.0625rem",
          padding: "20px 22px",
        },
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
