import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import { t } from "@/lib/translations";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  title?: string;
  subtitle?: string;
  items?: FAQItem[];
}

const defaultFAQs: FAQItem[] = t.defaultFaq as FAQItem[];

export const FAQSection = ({ 
  title = t.faq.title,
  subtitle = t.faq.subtitle,
  items = defaultFAQs 
}: FAQSectionProps) => {
  return (
    <section className="py-16 lg:py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-accent border-2 border-border shadow-brutal-sm flex items-center justify-center">
            <HelpCircle className="h-8 w-8 text-accent-foreground" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-black mb-4">{title}</h2>
          <p className="text-muted-foreground text-lg font-medium">{subtitle}</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {items.map((item, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-background border-2 border-border shadow-brutal-sm px-6"
              >
                <AccordionTrigger className="text-left font-bold hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
