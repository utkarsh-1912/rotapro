"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarCheck, Shield, Users } from "lucide-react";

const Logo = () => (
  <svg width="48" height="48" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="8" fill="currentColor"/>
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white" dy=".05em">RP</text>
  </svg>
);


export default function LandingPage() {
  const featureVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.5,
      },
    }),
  };

  const features = [
    {
      icon: <CalendarCheck className="h-8 w-8 text-primary" />,
      title: "Intelligent Rota Generation",
      description: "Automatically create fair and balanced shift schedules for your team in seconds.",
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Team Management",
      description: "Easily add, remove, and manage your team members and their fixed shift assignments.",
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Admin Controls",
      description: "Powerful admin panel to oversee all aspects of shift and rota management.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex items-center">
            <Link href="/" className="flex items-center gap-2">
               <Logo />
               <span className="font-bold text-xl">RotaPro</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <nav className="flex items-center">
              <Button asChild variant="ghost">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 md:py-32">
          <div className="container text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                The Future of Team Scheduling is Here
              </h1>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                RotaPro simplifies complex scheduling. Generate fair, optimized rotas, manage your team, and keep everyone in sync—effortlessly.
              </p>
              <div className="mt-8 flex justify-center gap-4">
                <Button asChild size="lg">
                  <Link href="/signup">Get Started for Free</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                   <Link href="/login">Login</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-20 md:py-32 bg-secondary">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Why RotaPro?</h2>
              <p className="mt-2 text-muted-foreground">Everything you need for efficient shift management.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  custom={i}
                  variants={featureVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="bg-card p-6 rounded-lg shadow-md border"
                >
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 md:px-8 md:py-0 border-t">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by Your AI Assistant.
          </p>
        </div>
      </footer>
    </div>
  );
}
