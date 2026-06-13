import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  FileSearch,
  LineChart,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Blocks,
    title: "Modulos a tu medida",
    description:
      "Pulso recomienda solo las herramientas que corresponden al giro y etapa de tu negocio.",
  },
  {
    icon: LineChart,
    title: "Liquidez visible",
    description:
      "Registra entradas y salidas, identifica riesgos y prepara escenarios a 30, 60 y 90 dias.",
  },
  {
    icon: FileSearch,
    title: "Orientacion fiscal",
    description:
      "Analiza tu informacion fiscal y convierte obligaciones complejas en siguientes pasos claros.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/85 px-4 backdrop-blur-md md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <WalletCards className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">Pulso AI</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium">
            Iniciar sesion
          </Link>
          <Link href="/register">
            <Button size="sm">Crear cuenta</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden py-24 md:py-36">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="container mx-auto px-4 text-center md:px-6">
            <div className="mx-auto max-w-4xl">
              <p className="mb-5 text-sm font-medium text-muted-foreground">
                Organizacion accesible para microempresas mexicanas
              </p>
              <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
                Entiende el pulso de tu negocio
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Reune finanzas, operacion y situacion fiscal en un solo lugar.
                Pulso AI transforma datos dispersos en acciones que puedes tomar hoy.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/register">
                  <Button size="lg" className="w-full px-8 sm:w-auto">
                    Digitalizar mi negocio
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full px-8 sm:w-auto">
                    Entrar
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted/30 py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Empieza con lo esencial
              </h2>
              <p className="mt-3 text-muted-foreground">
                Sin implementar un ERP complejo ni cambiar por completo la forma
                en que trabaja tu equipo.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-2xl border bg-card p-7">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground md:flex-row md:px-6">
          <span className="font-medium text-foreground">Pulso AI</span>
          <span>Construido para fortalecer negocios mexicanos.</span>
        </div>
      </footer>
    </div>
  );
}
