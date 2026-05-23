"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { PromptIde } from "@/components/ide/prompt-ide";
import { PromptEnhancer } from "@/components/developers/prompt-enhancer";
import { EmbedDesigner } from "@/components/developers/embed-designer";
import { PromptTokenizer } from "@/components/developers/prompt-tokenizer";
import { ApiReference } from "@/components/developers/api-reference";
import { Monitor, Code2, Sparkles, Frame, Hash, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const VALID_TABS = ["enhancer", "tokenizer", "builder", "embed", "api"] as const;
type TabValue = (typeof VALID_TABS)[number];

export default function DevelopersPage() {
  const t = useTranslations("developers");
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>("enhancer");

  const updateTabFromHash = useCallback(() => {
    const hash = window.location.hash.replace("#", "");
    if (VALID_TABS.includes(hash as TabValue)) {
      setActiveTab(hash as TabValue);
    }
  }, []);

  useEffect(() => {
    setMounted(true);

    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    updateTabFromHash();
    window.addEventListener("hashchange", updateTabFromHash);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("hashchange", updateTabFromHash);
    };
  }, [updateTabFromHash]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue);
    window.history.replaceState(null, "", `#${value}`);
  };

  if (!mounted) return null;

  if (isMobile && activeTab !== "api") {
    return (
      <div className="container flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <Monitor className="h-16 w-16 text-muted-foreground mb-6" />
        <h1 className="text-2xl font-bold mb-2">{t("desktopOnly")}</h1>
        <p className="text-muted-foreground mb-6 max-w-md">{t("desktopOnlyDescription")}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleTabChange("api")}>
            <BookOpen className="h-4 w-4 mr-1.5" />
            API Reference
          </Button>
          <Button asChild>
            <Link href="/prompts">{t("browsePrompts")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const triggerClass =
    "h-9 border-0 border-b-2 border-b-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none rounded-none px-3 py-2 gap-1.5 text-sm";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem-1.65rem)] overflow-hidden">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full gap-0 overflow-hidden">
        <div className="h-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 shrink-0 flex items-center overflow-x-auto">
          <TabsList className="h-9 bg-transparent border-0 p-0 gap-2 w-max">
            <TabsTrigger value="enhancer" className={triggerClass}>
              <Sparkles className="h-3.5 w-3.5" />
              {t("promptEnhancer")}
            </TabsTrigger>
            <TabsTrigger value="tokenizer" className={triggerClass}>
              <Hash className="h-3.5 w-3.5" />
              {t("promptTokenizer")}
            </TabsTrigger>
            <TabsTrigger value="builder" className={triggerClass}>
              <Code2 className="h-3.5 w-3.5" />
              {t("promptBuilder")}
            </TabsTrigger>
            <TabsTrigger value="embed" className={triggerClass}>
              <Frame className="h-3.5 w-3.5" />
              {t("embedDesigner")}
            </TabsTrigger>
            <TabsTrigger value="api" className={triggerClass}>
              <BookOpen className="h-3.5 w-3.5" />
              API Reference
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="enhancer" className="flex-1 mt-0 min-h-0 overflow-hidden data-[state=inactive]:hidden">
          <PromptEnhancer />
        </TabsContent>
        <TabsContent value="tokenizer" className="flex-1 mt-0 min-h-0 overflow-hidden data-[state=inactive]:hidden">
          <PromptTokenizer />
        </TabsContent>
        <TabsContent value="builder" className="flex-1 mt-0 min-h-0 overflow-hidden data-[state=inactive]:hidden">
          <PromptIde />
        </TabsContent>
        <TabsContent value="embed" className="flex-1 mt-0 min-h-0 overflow-hidden data-[state=inactive]:hidden">
          <EmbedDesigner />
        </TabsContent>
        <TabsContent value="api" className="flex-1 mt-0 min-h-0 overflow-y-auto data-[state=inactive]:hidden">
          <ApiReference />
        </TabsContent>
      </Tabs>
    </div>
  );
}
