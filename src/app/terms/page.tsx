
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-extrabold tracking-tight">Terms of Service & Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose-base max-w-none text-muted-foreground space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-foreground">1. Terms of Service</h2>
              <p>By accessing and using RotaPro (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. This is a demonstration application, and as such, is provided "as is" without any warranties, express or implied. The Service is intended for evaluation and demonstration purposes only.</p>
              <p>You agree not to use the Service for any unlawful purpose or in any way that interrupts, damages, or impairs the service. You are responsible for maintaining the confidentiality of your account and password.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground">2. Privacy Policy</h2>
              <p>This Privacy Policy describes how your personal information is handled in RotaPro. Since this is a demo application, we minimize data collection. We collect your name, email, and password for authentication purposes. We also store data you input, such as team members and shift schedules, to provide the Service's functionality.</p>
              <p>We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. Your data is used solely for the operation of this demonstration application. We implement a variety of security measures to maintain the safety of your personal information.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground">3. Limitation of Liability</h2>
              <p>In no event shall the creators or providers of RotaPro be liable for any direct, indirect, incidental, special, or consequential damages arising out of or in connection with the use or inability to use the Service. As a demo app, data may be reset or become inaccessible without notice.</p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
