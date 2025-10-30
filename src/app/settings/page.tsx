
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { useAuthStore } from "@/lib/auth-store";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(6, "New password must be at least 6 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

function ProfileForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { user, profile } = useAuthStore();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || "",
      email: profile?.email || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    setIsLoading(true);

    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      setIsLoading(false);
      return;
    }

    try {
      const auth = getAuth();
      const firestore = getFirestore();

      // Update auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: values.name });
      }
      
      // Update firestore profile
      const userDocRef = doc(firestore, "users", user.uid);
      await updateDoc(userDocRef, { name: values.name });

      toast({ title: "Success", description: "Your profile has been updated." });

    } catch (error) {
       console.error("Profile Update Error:", error);
       toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update your profile. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your personal information.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} disabled={isLoading} />
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
                    <Input type="email" {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Profile"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function PasswordForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof passwordSchema>) => {
    setIsLoading(true);

    if (!user || !user.email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to change your password.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const auth = getAuth();
      const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
      
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, values.newPassword);

      toast({
        title: "Success",
        description: "Your password has been updated successfully.",
      });
      form.reset();

    } catch (error) {
      console.error("Password Change Error:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case "auth/wrong-password":
          case "auth/invalid-credential":
            errorMessage = "The current password you entered is incorrect.";
            break;
          case "auth/too-many-requests":
             errorMessage = "Too many attempts. Please try again later.";
             break;
          default:
            errorMessage = "Failed to update password. Please try again.";
            break;
        }
      }
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
     <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Manage your account security and set a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          disabled={isLoading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword((prev) => !prev)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                          disabled={isLoading}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          disabled={isLoading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                          disabled={isLoading}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          disabled={isLoading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Change Password"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
  );
}


export default function SettingsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-6"
    >
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <ProfileForm />
        <PasswordForm />
      </div>
    </motion.div>
  );
}
