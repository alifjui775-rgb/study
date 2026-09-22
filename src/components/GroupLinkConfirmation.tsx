import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, ExternalLink } from "lucide-react";

interface GroupLinkConfirmationProps {
  courseSlug: string;
  groupLink: string;
  onDismiss: () => void;
}

export function GroupLinkConfirmation({
  courseSlug,
  groupLink,
  onDismiss,
}: GroupLinkConfirmationProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold">কোর্স পরিচালনা গ্রুপে যোগ দিন</h2>
          <p className="text-sm text-muted-foreground">
            এই কোর্সটি একটি WhatsApp/Telegram গ্রুপের মাধ্যমে পরিচালনা করা হয়।
            কোর্সের সকল আপডেট, ক্লাস ও পরীক্ষার সূচি এই গ্রুপে পাঠানো হবে।
          </p>
        </div>

        <div className="space-y-3">
          <a href={groupLink} target="_blank" rel="noopener noreferrer" className="w-full block">
            <Button className="w-full gap-2" size="lg">
              <ExternalLink className="h-4 w-4" />
              গ্রুপে যোগ দিন
            </Button>
          </a>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={onDismiss}
          >
            পরে করব
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
