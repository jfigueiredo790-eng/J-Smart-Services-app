import React from 'react';
import { 
  Zap, 
  Droplet, 
  Paintbrush, 
  Wrench, 
  Sparkles, 
  Flower2, 
  Hammer, 
  Monitor, 
  Wind, 
  HardHat,
  Briefcase,
  Scissors,
  Music,
  Camera,
  Video,
  Utensils,
  Lightbulb,
  Heart,
  Baby,
  Users,
  Sofa,
  Home,
  Crown,
  Smile,
  Shield,
  Layers,
  Sparkle,
  Car,
  Truck,
  Tv,
  Flame,
  Snowflake,
  Gift,
  ShoppingBag,
  Gem,
  FastForward,
  Mic,
  Edit3,
  PlusCircle,
  Radio,
  Package
} from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = "w-6 h-6" }) => {
  switch (name) {
    case 'Zap':
      return <Zap className={className} />;
    case 'Droplet':
      return <Droplet className={className} />;
    case 'Paintbrush':
      return <Paintbrush className={className} />;
    case 'Wrench':
      return <Wrench className={className} />;
    case 'Sparkles':
    case 'Sparkle':
      return <Sparkles className={className} />;
    case 'Flower2':
      return <Flower2 className={className} />;
    case 'Hammer':
      return <Hammer className={className} />;
    case 'Monitor':
      return <Monitor className={className} />;
    case 'Wind':
      return <Wind className={className} />;
    case 'HardHat':
      return <HardHat className={className} />;
    case 'Scissors':
      return <Scissors className={className} />;
    case 'Music':
      return <Music className={className} />;
    case 'Camera':
      return <Camera className={className} />;
    case 'Video':
      return <Video className={className} />;
    case 'Utensils':
      return <Utensils className={className} />;
    case 'Lightbulb':
      return <Lightbulb className={className} />;
    case 'Heart':
      return <Heart className={className} />;
    case 'Baby':
      return <Baby className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'Sofa':
      return <Sofa className={className} />;
    case 'Home':
      return <Home className={className} />;
    case 'Crown':
      return <Crown className={className} />;
    case 'Smile':
      return <Smile className={className} />;
    case 'Layers':
      return <Layers className={className} />;
    case 'Car':
      return <Car className={className} />;
    case 'Truck':
      return <Truck className={className} />;
    case 'Tv':
      return <Tv className={className} />;
    case 'Flame':
      return <Flame className={className} />;
    case 'Snowflake':
      return <Snowflake className={className} />;
    case 'Gift':
      return <Gift className={className} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} />;
    case 'Gem':
      return <Gem className={className} />;
    case 'FastForward':
      return <FastForward className={className} />;
    case 'Mic':
      return <Mic className={className} />;
    case 'Edit3':
      return <Edit3 className={className} />;
    case 'PlusCircle':
      return <PlusCircle className={className} />;
    case 'Radio':
      return <Radio className={className} />;
    case 'Package':
      return <Package className={className} />;
    default:
      return <Briefcase className={className} />;
  }
};
