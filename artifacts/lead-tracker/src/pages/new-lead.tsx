import React from "react";
import { useLocation, Link } from "wouter";
import { NICHES, SUB_NICHES } from "@/lib/niches";
import { useCreateLead, getListLeadsQueryKey, getGetLeadStatsQueryKey, getListFollowupsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  status: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]),
  instagramHandle: z.string().optional(),
  niche: z.string().optional(),
  subNiche: z.string().optional(),
  estFollowers: z.string().optional(),
  profileBioSummary: z.string().optional(),
  monetizationGap: z.string().optional(),
  priorityScore: z.coerce.number().min(1).max(10),
  dmStatus: z.string(),
  response: z.string().optional(),
  callBooked: z.string(),
  notes: z.string().optional(),
});

export default function NewLead() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedNiche, setSelectedNiche] = React.useState<string>("");

  const createLead = useCreateLead({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLeadStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListFollowupsQueryKey() });
        toast({ title: "Lead created", description: "Added to your pipeline with 5 follow-ups scheduled." });
        setLocation(`/leads/${data.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create lead.", variant: "destructive" });
      },
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      status: "new",
      instagramHandle: "",
      niche: "",
      subNiche: "",
      estFollowers: "",
      profileBioSummary: "",
      monetizationGap: "",
      priorityScore: 5,
      dmStatus: "Not Sent",
      callBooked: "No",
      response: "",
      notes: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const { email, company, phone, instagramHandle, niche, subNiche, estFollowers, profileBioSummary, monetizationGap, response, notes, ...rest } = values;
    createLead.mutate({
      data: {
        ...rest,
        email: email || undefined,
        company: company || undefined,
        phone: phone || undefined,
        instagramHandle: instagramHandle || undefined,
        niche: niche || undefined,
        subNiche: subNiche || undefined,
        estFollowers: estFollowers || undefined,
        profileBioSummary: profileBioSummary || undefined,
        monetizationGap: monetizationGap || undefined,
        response: response || undefined,
        notes: notes || undefined,
      },
    });
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/leads"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add New Lead</h1>
          <p className="text-muted-foreground">Name is the only required field — fill in whatever else applies</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Info</CardTitle>
              <CardDescription>Works for any lead, creator or sales.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pipeline Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="proposal">Proposal</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corp" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="555-0100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Creator Profile</CardTitle>
              <CardDescription>Optional — fill in for Instagram creator-outreach leads.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="instagramHandle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram Handle</FormLabel>
                      <FormControl>
                        <Input placeholder="@creator" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estFollowers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Est. Followers</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. ~50K" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="niche"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Niche</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          setSelectedNiche(val);
                          form.setValue("subNiche", "");
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a niche" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {NICHES.map((n) => (
                            <SelectItem key={n} value={n}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subNiche"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-niche</FormLabel>
                      {selectedNiche && SUB_NICHES[selectedNiche]?.length ? (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a sub-niche" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SUB_NICHES[selectedNiche].map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <FormControl>
                          <Input placeholder={selectedNiche ? "Enter sub-niche" : "Select a niche first"} disabled={!selectedNiche} {...field} />
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="profileBioSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio Summary</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Quick summary of their bio and content..." className="resize-y" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Strategy & Outreach</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="monetizationGap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monetization Gap</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What are they missing out on?" className="resize-y" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="dmStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DM Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Not Sent">Not Sent</SelectItem>
                          <SelectItem value="Sent">Sent</SelectItem>
                          <SelectItem value="Replied">Replied</SelectItem>
                          <SelectItem value="Interested">Interested</SelectItem>
                          <SelectItem value="Not Interested">Not Interested</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="callBooked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Call Booked</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priorityScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority (1-10)</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 10 }).map((_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any other context..." className="resize-y" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" asChild>
              <Link href="/leads">Cancel</Link>
            </Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Lead"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
