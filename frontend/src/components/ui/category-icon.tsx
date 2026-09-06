import { 
  Scale, 
  Users, 
  ScrollText, 
  Building2, 
  Briefcase, 
  Home, 
  Landmark, 
  Calculator, 
  CreditCard, 
  Globe, 
  Flag, 
  Plane, 
  FileWarning, 
  Lightbulb, 
  Laptop, 
  Car, 
  TreePine, 
  ShoppingCart,
  HelpCircle
} from "lucide-react"

export function CategoryIcon({ id, className }: { id: string, className?: string }) {
  const iconMap: Record<string, React.ElementType> = {
    "criminal-law": Scale,
    "family-law": Users,
    "civil-law": ScrollText,
    "corporate-law": Building2,
    "labor-law": Briefcase,
    "real-estate-law": Home,
    "administrative-law": Landmark,
    "tax-law": Calculator,
    "banking-finance-law": CreditCard,
    "international-law": Globe,
    "echr": Flag,
    "migration-law": Plane,
    "execution-bankruptcy-law": FileWarning,
    "intellectual-property": Lightbulb,
    "it-cyber-law": Laptop,
    "traffic-transport-law": Car,
    "environmental-law": TreePine,
    "consumer-rights": ShoppingCart,
  }

  const IconComponent = iconMap[id] || HelpCircle

  return <IconComponent className={className} />
}
