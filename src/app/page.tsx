import Link from "next/link";
import { Wallet, ArrowRight, Zap, Shield, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Wallet className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">FinFlow</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-primary">
            Iniciar Sesión
          </Link>
          <Link href="/register">
            <Button size="sm">Comenzar Gratis</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32 lg:py-40">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-sm font-medium backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2" />
                Ahora con procesamiento de IA integrado
              </div>
              <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                La forma inteligente de gestionar tus finanzas
              </h1>
              <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
                Automatiza tu contabilidad, captura recibos con Inteligencia Artificial y obtén análisis en tiempo real de tu flujo de caja. Diseñado para empresas modernas.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link href="/register">
                  <Button size="lg" className="h-12 px-8 text-base w-full sm:w-auto">
                    Comienza Gratis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="h-12 px-8 text-base w-full sm:w-auto">
                    Ver Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Todo lo que necesitas para crecer
              </h2>
              <p className="mt-4 text-muted-foreground md:text-lg">
                Herramientas poderosas diseñadas para simplificar tu vida financiera.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {/* Feature 1 */}
              <div className="relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-6">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Extracción con IA</h3>
                <p className="text-muted-foreground">
                  Sube tus tickets y facturas. Nuestra IA extraerá automáticamente el proveedor, fecha y monto sin que tengas que teclear nada.
                </p>
              </div>
              {/* Feature 2 */}
              <div className="relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-6">
                  <LineChart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Análisis en Tiempo Real</h3>
                <p className="text-muted-foreground">
                  Visualiza tu flujo de caja con gráficos interactivos. Identifica tendencias de gastos y toma mejores decisiones de negocio.
                </p>
              </div>
              {/* Feature 3 */}
              <div className="relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-6">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Seguridad Nivel Bancario</h3>
                <p className="text-muted-foreground">
                  Tus datos están encriptados y seguros. Cumplimos con los más altos estándares de seguridad de la industria.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-background">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="font-semibold">FinFlow Inc.</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 FinFlow. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
