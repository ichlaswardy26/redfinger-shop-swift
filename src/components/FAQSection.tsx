import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  title?: string;
  subtitle?: string;
  items?: FAQItem[];
}

const defaultFAQs: FAQItem[] = [
  {
    question: "What is Redfinger Cloud Phone?",
    answer: "Redfinger is a cloud-based virtual Android phone that runs 24/7 on our servers. You can access it from any device, anywhere in the world, without draining your phone's battery or storage."
  },
  {
    question: "How do I redeem my code?",
    answer: "After your payment is verified, you'll receive a unique redeem code. Open the Redfinger app, go to Settings > Redeem Code, and enter your code to activate your subscription."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept bank transfers and various e-wallet payments. Simply place your order, upload your payment proof, and our team will verify it within 24 hours."
  },
  {
    question: "Can I use multiple cloud phones?",
    answer: "Yes! You can purchase multiple codes to run multiple cloud phone instances simultaneously. Each code gives you access to one cloud phone device."
  },
  {
    question: "What happens when my subscription expires?",
    answer: "Your cloud phone data will be preserved for a grace period. You can renew your subscription to continue using the same device, or your data will be deleted after the grace period ends."
  },
  {
    question: "How do I contact support?",
    answer: "You can create a support ticket from your Transactions page after placing an order. Our team typically responds within 24 hours."
  }
];

export const FAQSection = ({ 
  title = "Frequently Asked Questions",
  subtitle = "Everything you need to know about our services",
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
