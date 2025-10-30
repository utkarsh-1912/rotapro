
"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarCheck, Settings, Users } from "lucide-react";
import Image from "next/image";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


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
      icon: <Settings className="h-8 w-8 text-primary" />,
      title: "Config Panel",
      description: "Powerful config panel to oversee all aspects of shift and rota management.",
    },
  ];

  return (
    <AppLayout>
      <main>
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl">
                    The Future of Team Scheduling is Here
                  </h1>
                  <p className="mt-4 text-lg text-muted-foreground">
                    RotaPro simplifies complex scheduling. Generate fair, optimized rotas, manage your team, and keep everyone in sync—effortlessly.
                  </p>
                  <div className="mt-8 flex justify-start gap-4">
                    <Button asChild size="lg">
                      <Link href="/signup">Get Started for Free</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                       <Link href="#features">Explore Features</Link>
                    </Button>
                  </div>
                </motion.div>
                <motion.div
                    className="relative h-64 md:h-96 rounded-xl border shadow-lg"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Image
                        src="https://picsum.photos/seed/rotapro/1200/800"
                        alt="RotaPro schedule dashboard"
                        fill
                        className="object-cover rounded-xl"
                        data-ai-hint="team schedule"
                    />
                </motion.div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 md:py-32 bg-secondary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
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

        <section id="contact" className="py-20 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl font-extrabold tracking-tight">Get in Touch</CardTitle>
                  <CardDescription>Have a question or feedback? We'd love to hear from you.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name-landing">Name</Label>
                        <Input id="name-landing" placeholder="Your Name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-landing">Email</Label>
                        <Input id="email-landing" type="email" placeholder="you@example.com" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message-landing">Message</Label>
                      <Textarea id="message-landing" placeholder="Your message here..." rows={5} />
                    </div>
                    <div className="text-center pt-2">
                      <Button type="submit" size="lg">Send Message</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

      </main>
    </AppLayout>
  );
}
