import { Navbar } from "@/components/Navbar";
import { ChatProvider } from "@/lib/chat-context";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ChatProvider>
      <div className="flex min-h-full flex-col bg-background">
        <Navbar />
        <main className="mx-auto w-full max-w-360 flex-1 px-container-padding-mobile py-stack-lg md:px-container-padding-desktop">
          {children}
        </main>
      </div>
    </ChatProvider>
  );
}
