import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      {/* Hero Section */}
      <section className="py-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Build Your Enterprise Blockchain with Hyperledger Besu</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          Create, manage, and scale your private Ethereum networks with our powerful Besu Network Manager
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/dashboard">Get Started</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/networks">Manage Networks</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center mb-8">Why Choose Besu Networks?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Enterprise-Grade Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Built on Hyperledger Besu, our networks provide enterprise-level security with permissioning and private transactions.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Scalable Architecture</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Easily scale your network by adding new nodes with different roles to meet your performance requirements.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Full Ethereum Compatibility</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Leverage the entire Ethereum ecosystem while maintaining control over your private network.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 bg-muted rounded-lg p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build Your Besu Network?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Our intuitive dashboard makes it easy to create and manage your blockchain infrastructure.
          </p>
          <Button size="lg" asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
