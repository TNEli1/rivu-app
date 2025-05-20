import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { Twitter, Facebook, Instagram, Linkedin, Youtube, MessageSquare, Globe, BookOpen, Bell, ExternalLink } from "lucide-react";

export default function ConnectPage() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar - Desktop only */}
      <Sidebar />
      
      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 pt-6 pb-16 md:ml-64">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Connect with Us</h1>
              <p className="text-muted-foreground mt-1">Stay up-to-date with financial news and Rivu updates</p>
            </div>
          </div>

          <div className="grid gap-8">
            {/* Social Media Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Connect on Social Media</CardTitle>
                <CardDescription>
                  Follow us for financial tips, product updates, and community discussions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" size="lg" className="h-24 flex flex-col gap-2">
                    <Twitter className="h-6 w-6 text-blue-400" />
                    <span>Twitter</span>
                  </Button>
                  <Button variant="outline" size="lg" className="h-24 flex flex-col gap-2">
                    <Facebook className="h-6 w-6 text-blue-600" />
                    <span>Facebook</span>
                  </Button>
                  <Button variant="outline" size="lg" className="h-24 flex flex-col gap-2">
                    <Instagram className="h-6 w-6 text-pink-500" />
                    <span>Instagram</span>
                  </Button>
                  <Button variant="outline" size="lg" className="h-24 flex flex-col gap-2">
                    <Linkedin className="h-6 w-6 text-blue-700" />
                    <span>LinkedIn</span>
                  </Button>
                </div>
                
                <Separator className="my-6" />
                
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                  <Button variant="outline" className="h-14 w-full sm:w-auto flex gap-2 items-center">
                    <Youtube className="h-5 w-5 text-red-500" />
                    <span>YouTube Channel</span>
                  </Button>
                  <Button variant="outline" className="h-14 w-full sm:w-auto flex gap-2 items-center">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                    <span>Community Forum</span>
                  </Button>
                  <Button variant="outline" className="h-14 w-full sm:w-auto flex gap-2 items-center">
                    <Globe className="h-5 w-5 text-green-500" />
                    <span>Blog</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Newsletter Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Financial News & Updates</CardTitle>
                <CardDescription>
                  Stay informed on the latest financial trends and product updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Daily Market Insights</h3>
                    <p className="text-muted-foreground mb-4">
                      Receive curated financial news that matters to your investments and personal finance goals.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Subscribe
                      </Button>
                      <Button variant="outline">
                        See Sample
                      </Button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-3">Rivu Product Updates</h3>
                    <p className="text-muted-foreground mb-4">
                      Be the first to learn about new features, improvements, and special events.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Subscribe
                      </Button>
                      <Button variant="outline">
                        View Update Log
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Featured Financial News */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Featured Financial News</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <div className="h-36 bg-muted rounded-t-lg"></div>
                  <CardContent className="pt-4">
                    <h3 className="font-medium text-lg mb-2">Understanding Market Volatility</h3>
                    <p className="text-sm text-muted-foreground">
                      What causes market swings and how to maintain your strategy during uncertain times.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Read Article
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card>
                  <div className="h-36 bg-muted rounded-t-lg"></div>
                  <CardContent className="pt-4">
                    <h3 className="font-medium text-lg mb-2">Inflation Impact on Savings</h3>
                    <p className="text-sm text-muted-foreground">
                      How rising prices affect your long-term financial goals and ways to protect your savings.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Read Article
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card>
                  <div className="h-36 bg-muted rounded-t-lg"></div>
                  <CardContent className="pt-4">
                    <h3 className="font-medium text-lg mb-2">Smart Tax Planning Strategies</h3>
                    <p className="text-sm text-muted-foreground">
                      Optimize your tax situation with these expert tips designed for various income levels.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Read Article
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>

            {/* Community Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Upcoming Events</CardTitle>
                <CardDescription>
                  Join our virtual events with financial experts and the Rivu community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row justify-between border p-4 rounded-lg">
                    <div>
                      <h3 className="font-medium">Retirement Planning Webinar</h3>
                      <p className="text-sm text-muted-foreground">Learn strategies for a secure retirement at any age</p>
                    </div>
                    <div className="md:text-right mt-2 md:mt-0">
                      <p className="text-sm font-medium">June 15, 2025</p>
                      <Button size="sm" className="mt-2">Register</Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row justify-between border p-4 rounded-lg">
                    <div>
                      <h3 className="font-medium">Investing Q&A Live Session</h3>
                      <p className="text-sm text-muted-foreground">Get your investment questions answered by our experts</p>
                    </div>
                    <div className="md:text-right mt-2 md:mt-0">
                      <p className="text-sm font-medium">June 28, 2025</p>
                      <Button size="sm" className="mt-2">Register</Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row justify-between border p-4 rounded-lg">
                    <div>
                      <h3 className="font-medium">Debt Freedom Workshop</h3>
                      <p className="text-sm text-muted-foreground">Practical steps to eliminate debt and build financial freedom</p>
                    </div>
                    <div className="md:text-right mt-2 md:mt-0">
                      <p className="text-sm font-medium">July 10, 2025</p>
                      <Button size="sm" className="mt-2">Register</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}