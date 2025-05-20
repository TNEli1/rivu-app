import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { PlayCircle, BookOpen, Award, Clock, ExternalLink } from "lucide-react";
import { FaTiktok, FaFacebook, FaYoutube } from "react-icons/fa";
import { SiSubstack } from "react-icons/si";

export default function RivUPage() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar - Desktop only */}
      <Sidebar />
      
      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 pt-6 pb-16 md:ml-64">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">RivU</h1>
              <p className="text-muted-foreground mt-1">Financial education at your fingertips</p>
            </div>
          </div>

          <div className="grid gap-8">
            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Welcome to RivU</CardTitle>
                <CardDescription>
                  Your personal finance learning hub with expert-created educational content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  RivU is designed to help you build financial literacy through curated videos,
                  articles, and interactive lessons. Learn at your own pace and develop
                  the skills needed to make smarter financial decisions.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-primary/5">
                    <BookOpen className="h-8 w-8 text-primary mb-2" />
                    <h3 className="font-medium">Learning Library</h3>
                    <p className="text-sm text-muted-foreground">Curated resources for every financial topic</p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-primary/5">
                    <Clock className="h-8 w-8 text-primary mb-2" />
                    <h3 className="font-medium">Self-Paced</h3>
                    <p className="text-sm text-muted-foreground">Learn on your schedule, at your own speed</p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-primary/5">
                    <Award className="h-8 w-8 text-primary mb-2" />
                    <h3 className="font-medium">Expert Content</h3>
                    <p className="text-sm text-muted-foreground">Created by certified financial educators</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Featured Courses */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Featured Video Courses</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Course 1 */}
                <Card>
                  <div className="aspect-video bg-muted relative rounded-t-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <PlayCircle className="h-16 w-16 text-white opacity-80" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3">
                      <h3 className="font-medium">Budgeting Fundamentals</h3>
                    </div>
                  </div>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Learn the core principles of effective budgeting and how to create a 
                      personalized plan that works for your financial situation.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Coming Soon
                    </Button>
                  </CardFooter>
                </Card>

                {/* Course 2 */}
                <Card>
                  <div className="aspect-video bg-muted relative rounded-t-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <PlayCircle className="h-16 w-16 text-white opacity-80" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3">
                      <h3 className="font-medium">Investing for Beginners</h3>
                    </div>
                  </div>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Start your investment journey with this beginner-friendly course covering 
                      the basics of stocks, bonds, mutual funds, and more.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Coming Soon
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>

            {/* Learning Tracks */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Learning Tracks</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle>Financial Foundations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                        Budgeting Basics
                      </li>
                      <li className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                        Debt Management
                      </li>
                      <li className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                        Emergency Funds
                      </li>
                      <li className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                        Credit Scores
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full">View Track</Button>
                  </CardFooter>
                </Card>
                
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle>Investing Essentials</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                        Investment Vehicles
                      </li>
                      <li className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                        Asset Allocation
                      </li>
                      <li className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                        Risk Management
                      </li>
                      <li className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                        Portfolio Building
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full">View Track</Button>
                  </CardFooter>
                </Card>
                
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle>Life Planning</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                        Retirement Planning
                      </li>
                      <li className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                        Estate Planning
                      </li>
                      <li className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                        Tax Strategies
                      </li>
                      <li className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                        Insurance Coverage
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full">View Track</Button>
                  </CardFooter>
                </Card>
              </div>
            </div>

            {/* Social Media Links Section */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-4">Stay Connected</h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="mb-6 text-muted-foreground">
                    Follow Rivu on social media for more financial tips, updates, and educational content.
                  </p>
                  
                  <div className="flex flex-wrap gap-4 justify-center sm:justify-between items-center">
                    <a 
                      href="https://www.tiktok.com/@tryrivu" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      <FaTiktok className="h-8 w-8 text-black" />
                      <span className="text-sm font-medium flex items-center gap-1">
                        TikTok <ExternalLink className="h-3 w-3" />
                      </span>
                    </a>
                    
                    <a 
                      href="https://www.facebook.com/tryrivu" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      <FaFacebook className="h-8 w-8 text-blue-600" />
                      <span className="text-sm font-medium flex items-center gap-1">
                        Facebook <ExternalLink className="h-3 w-3" />
                      </span>
                    </a>
                    
                    <a 
                      href="https://substack.com/@therivureport" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      <SiSubstack className="h-8 w-8 text-orange-600" />
                      <span className="text-sm font-medium flex items-center gap-1">
                        The Rivu Report <ExternalLink className="h-3 w-3" />
                      </span>
                    </a>
                    
                    <a 
                      href="https://youtube.com/@tryrivu" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      <FaYoutube className="h-8 w-8 text-red-600" />
                      <span className="text-sm font-medium flex items-center gap-1">
                        YouTube <ExternalLink className="h-3 w-3" />
                      </span>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}