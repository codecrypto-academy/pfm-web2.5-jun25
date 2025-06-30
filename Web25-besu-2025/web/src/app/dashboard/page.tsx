import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Networks</CardTitle>
            <CardDescription>Manage your Besu networks</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Create, edit, and delete Besu networks with custom chain IDs and signers.</p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/networks">Manage Networks</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nodes</CardTitle>
            <CardDescription>Manage nodes in your networks</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Add and configure different types of nodes: miners, RPC endpoints, and bootnodes.</p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/networks">View Networks</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentation</CardTitle>
            <CardDescription>Learn about Besu networks</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Access guides and documentation about setting up and managing Hyperledger Besu networks.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild>
              <Link href="https://besu.hyperledger.org/en/stable/" target="_blank">View Docs</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/networks/create">Create New Network</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/networks">View All Networks</Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 