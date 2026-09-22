import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { syllabusData } from "@/lib/syllabus-data";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CheckedState = {
  [subject: string]: {
    [paper: string]: string[];
  };
};

export default function SyllabusTracker() {
  const { user } = useAuth();
  const [checkedChapters, setCheckedChapters] = useState<CheckedState>({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (user?.uid) {
      const savedState = localStorage.getItem(`syllabus_tracker_${user.uid}`);
      if (savedState) {
        setCheckedChapters(JSON.parse(savedState));
      }
    }
  }, [user]);

  const handleCheckChange = (subject: string, paper: string, chapter: string) => {
    const newCheckedState = { ...checkedChapters };
    if (!newCheckedState[subject]) {
      newCheckedState[subject] = {};
    }
    if (!newCheckedState[subject][paper]) {
      newCheckedState[subject][paper] = [];
    }

    const paperChapters = newCheckedState[subject][paper];
    if (paperChapters.includes(chapter)) {
      newCheckedState[subject][paper] = paperChapters.filter((c) => c !== chapter);
    } else {
      newCheckedState[subject][paper].push(chapter);
    }

    setCheckedChapters(newCheckedState);
    if (user?.uid) {
      localStorage.setItem(`syllabus_tracker_${user.uid}`, JSON.stringify(newCheckedState));
    }
  };

  const calculateProgress = (subject: string) => {
    const subjectData = syllabusData.find((s) => s.subject === subject);
    if (!subjectData) return 0;

    let totalChapters = 0;
    let checkedCount = 0;

    subjectData.papers.forEach((paper) => {
      totalChapters += paper.chapters.length;
      const checkedPaperChapters = checkedChapters[subject]?.[paper.paper] || [];
      checkedCount += checkedPaperChapters.length;
    });

    return totalChapters > 0 ? (checkedCount / totalChapters) * 100 : 0;
  };

  if (!isClient) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>সিলেবাস ট্র্যাকার</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {syllabusData.map((subjectItem) => (
            <AccordionItem key={subjectItem.subject} value={subjectItem.subject}>
              <AccordionTrigger>
                <div className="flex-1 text-left">
                  <p className="font-semibold">{subjectItem.subject}</p>
                  <Progress value={calculateProgress(subjectItem.subject)} className="h-2 mt-1" />
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {subjectItem.papers.map((paperItem) => (
                  <div key={paperItem.paper} className="mb-4 pl-4">
                    <h4 className="font-bold mb-2">{paperItem.paper}</h4>
                    <div className="space-y-2">
                      {paperItem.chapters.map((chapter) => (
                        <div key={chapter} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${subjectItem.subject}-${paperItem.paper}-${chapter}`}
                            checked={
                              checkedChapters[subjectItem.subject]?.[paperItem.paper]?.includes(
                                chapter,
                              ) || false
                            }
                            onCheckedChange={() =>
                              handleCheckChange(subjectItem.subject, paperItem.paper, chapter)
                            }
                          />
                          <Label htmlFor={`${subjectItem.subject}-${paperItem.paper}-${chapter}`}>
                            {chapter}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
