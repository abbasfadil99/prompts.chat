"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  site_name: z.string().max(100).optional(),
  site_description: z.string().max(300).optional(),
  contact_email: z.string().email("Invalid email").or(z.literal("")).optional(),
  maintenance_mode: z.boolean().optional(),
  allow_registration: z.boolean().optional(),
  max_prompts_per_day: z.coerce.number().int().min(1).max(1000).optional(),
  announcement: z.string().max(500).optional(),
  featured_banner_enabled: z.boolean().optional(),
  featured_banner_text: z.string().max(200).optional(),
  featured_banner_url: z.string().url("Invalid URL").or(z.literal("")).optional(),
});

type Settings = z.infer<typeof schema>;

export function SiteSettingsPanel() {
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Settings>({ resolver: zodResolver(schema) });

  const maintenanceMode = watch("maintenance_mode");
  const allowRegistration = watch("allow_registration");
  const bannerEnabled = watch("featured_banner_enabled");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        setValue("site_name", data.site_name ?? "");
        setValue("site_description", data.site_description ?? "");
        setValue("contact_email", data.contact_email ?? "");
        setValue("maintenance_mode", data.maintenance_mode === "true");
        setValue("allow_registration", data.allow_registration !== "false");
        setValue("max_prompts_per_day", data.max_prompts_per_day ? Number(data.max_prompts_per_day) : 10);
        setValue("announcement", data.announcement ?? "");
        setValue("featured_banner_enabled", data.featured_banner_enabled === "true");
        setValue("featured_banner_text", data.featured_banner_text ?? "");
        setValue("featured_banner_url", data.featured_banner_url ?? "");
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, [setValue]);

  const onSubmit = async (data: Settings) => {
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== null) payload[k] = String(v);
    }

    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success("Settings saved successfully");
    } else {
      toast.error("Failed to save settings");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* General */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">General</CardTitle>
          <CardDescription className="text-xs">Basic site information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="site_name" className="text-xs">Site Name</Label>
            <Input id="site_name" placeholder="prompts.chat" {...register("site_name")} />
            {errors.site_name && <p className="text-xs text-destructive">{errors.site_name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="site_description" className="text-xs">Site Description</Label>
            <Input id="site_description" placeholder="Collect, organize, and share AI prompts" {...register("site_description")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="contact_email" className="text-xs">Contact Email</Label>
            <Input id="contact_email" type="email" placeholder="admin@example.com" {...register("contact_email")} />
            {errors.contact_email && <p className="text-xs text-destructive">{errors.contact_email.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Access Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Access Control</CardTitle>
          <CardDescription className="text-xs">User registration and site availability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">Show a maintenance page to non-admin users</p>
            </div>
            <Switch
              checked={maintenanceMode ?? false}
              onCheckedChange={(v) => setValue("maintenance_mode", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Allow Registration</p>
              <p className="text-xs text-muted-foreground">Allow new users to register</p>
            </div>
            <Switch
              checked={allowRegistration ?? true}
              onCheckedChange={(v) => setValue("allow_registration", v)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="max_prompts_per_day" className="text-xs">Max Prompts Per Day (per user)</Label>
            <Input
              id="max_prompts_per_day"
              type="number"
              min={1}
              max={1000}
              {...register("max_prompts_per_day")}
              className="w-32"
            />
            {errors.max_prompts_per_day && (
              <p className="text-xs text-destructive">{errors.max_prompts_per_day.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Announcement Banner */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Announcement</CardTitle>
          <CardDescription className="text-xs">Show a site-wide announcement to all users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="announcement" className="text-xs">Announcement Text</Label>
            <Input id="announcement" placeholder="We are undergoing maintenance on Saturday..." {...register("announcement")} />
            <p className="text-xs text-muted-foreground">Leave blank to hide the announcement</p>
          </div>
        </CardContent>
      </Card>

      {/* Featured Banner */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Featured Banner</CardTitle>
          <CardDescription className="text-xs">Promotional banner shown on the homepage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable Banner</p>
            </div>
            <Switch
              checked={bannerEnabled ?? false}
              onCheckedChange={(v) => setValue("featured_banner_enabled", v)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="featured_banner_text" className="text-xs">Banner Text</Label>
            <Input id="featured_banner_text" placeholder="Check out our new feature!" {...register("featured_banner_text")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="featured_banner_url" className="text-xs">Banner URL</Label>
            <Input id="featured_banner_url" placeholder="https://example.com/feature" {...register("featured_banner_url")} />
            {errors.featured_banner_url && (
              <p className="text-xs text-destructive">{errors.featured_banner_url.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting} className="gap-2">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Settings
      </Button>
    </form>
  );
}
