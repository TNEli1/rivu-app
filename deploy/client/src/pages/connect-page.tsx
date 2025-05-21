import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { ExternalLink } from "lucide-react";
import { FaTiktok, FaFacebook, FaYoutube } from "react-icons/fa";
import { SiSubstack } from "react-icons/si";

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
                <CardTitle className="text-2xl">Stay Connected</CardTitle>
                <CardDescription>
                  Follow Rivu on social media for more financial tips, updates, and educational content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-8 justify-center md:justify-between items-center py-4">
                  <a 
                    href="https://www.tiktok.com/@tryrivu" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-primary/5 transition-colors"
                  >
                    <FaTiktok className="h-12 w-12 text-black" />
                    <span className="text-base font-medium flex items-center gap-1">
                      TikTok <ExternalLink className="h-3 w-3" />
                    </span>
                  </a>
                  
                  <a 
                    href="https://www.facebook.com/tryrivu" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-primary/5 transition-colors"
                  >
                    <FaFacebook className="h-12 w-12 text-blue-600" />
                    <span className="text-base font-medium flex items-center gap-1">
                      Facebook <ExternalLink className="h-3 w-3" />
                    </span>
                  </a>
                  
                  <a 
                    href="https://substack.com/@therivureport" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-primary/5 transition-colors"
                  >
                    <SiSubstack className="h-12 w-12 text-orange-600" />
                    <span className="text-base font-medium flex items-center gap-1">
                      The Rivu Report <ExternalLink className="h-3 w-3" />
                    </span>
                  </a>
                  
                  <a 
                    href="https://youtube.com/@tryrivu" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-primary/5 transition-colors"
                  >
                    <FaYoutube className="h-12 w-12 text-red-600" />
                    <span className="text-base font-medium flex items-center gap-1">
                      YouTube <ExternalLink className="h-3 w-3" />
                    </span>
                  </a>
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