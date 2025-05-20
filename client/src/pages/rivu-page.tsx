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
                  RivU is designed to help you build financial literacy through curated videos.
                  Learn at your own pace and develop the skills needed to make smarter financial decisions.
                </p>
              </CardContent>
            </Card>

            {/* Video Placeholders */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Educational Videos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Video 1 */}
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
                      Learn the core principles of effective budgeting.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Coming Soon
                    </Button>
                  </CardFooter>
                </Card>

                {/* Video 2 */}
                <Card>
                  <div className="aspect-video bg-muted relative rounded-t-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <PlayCircle className="h-16 w-16 text-white opacity-80" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3">
                      <h3 className="font-medium">Investing Basics</h3>
                    </div>
                  </div>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Start your investment journey with beginner-friendly concepts.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Coming Soon
                    </Button>
                  </CardFooter>
                </Card>

                {/* Video 3 */}
                <Card>
                  <div className="aspect-video bg-muted relative rounded-t-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <PlayCircle className="h-16 w-16 text-white opacity-80" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3">
                      <h3 className="font-medium">Retirement Planning</h3>
                    </div>
                  </div>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Prepare for your future with effective retirement strategies.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Coming Soon
                    </Button>
                  </CardFooter>
                </Card>

                {/* Video 4 */}
                <Card>
                  <div className="aspect-video bg-muted relative rounded-t-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <PlayCircle className="h-16 w-16 text-white opacity-80" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3">
                      <h3 className="font-medium">Debt Management</h3>
                    </div>
                  </div>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Strategies to manage and eliminate debt effectively.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Coming Soon
                    </Button>
                  </CardFooter>
                </Card>

                {/* Video 5 */}
                <Card>
                  <div className="aspect-video bg-muted relative rounded-t-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <PlayCircle className="h-16 w-16 text-white opacity-80" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3">
                      <h3 className="font-medium">Tax Planning</h3>
                    </div>
                  </div>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Optimize your tax situation with effective planning techniques.
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
          </div>
        </div>
      </main>
      
      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}