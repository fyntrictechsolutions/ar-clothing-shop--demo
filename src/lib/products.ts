// Demo catalogue for the fictional label "Thira".
// `style`, `sleeve` and `pattern` drive both the flat-lay artwork and the AR try-on,
// so a new product only needs data here.

export type Style = "tee" | "shirt" | "hoodie" | "kurta" | "jacket";
export type Sleeve = "short" | "long";
export type Pattern = "solid" | "stripes" | "checks" | "dots";
export type Category = "tees" | "shirts" | "hoodies" | "kurtas" | "jackets";

export interface Colourway {
  name: string;
  /** Main fabric colour. */
  hex: string;
  /** Pattern / trim colour. */
  accent: string;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  style: Style;
  sleeve: Sleeve;
  pattern: Pattern;
  price: number;
  mrp?: number;
  fabric: string;
  fit: string;
  rating: number;
  reviews: number;
  tag?: string;
  description: string;
  colours: Colourway[];
  sizes: string[];
}

export const BRAND = "Thira";

export const CATEGORIES: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tees", label: "T-shirts" },
  { id: "shirts", label: "Shirts" },
  { id: "kurtas", label: "Kurtas" },
  { id: "hoodies", label: "Hoodies" },
  { id: "jackets", label: "Jackets" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export const PRODUCTS: Product[] = [
  {
    id: "everyday-cotton-tee",
    name: "Everyday Cotton Tee",
    category: "tees",
    style: "tee",
    sleeve: "short",
    pattern: "solid",
    price: 599,
    mrp: 799,
    fabric: "100% combed cotton, 180 GSM",
    fit: "Regular fit",
    rating: 4.5,
    reviews: 2140,
    tag: "Bestseller",
    description: "A soft, breathable crew-neck tee for Kerala summers. Pre-shrunk, so it keeps its shape wash after wash.",
    colours: [
      { name: "Monsoon Teal", hex: "#1F6F78", accent: "#174F55" },
      { name: "Chalk White", hex: "#F2EFE8", accent: "#D9D4C7" },
      { name: "Turmeric", hex: "#D9A21B", accent: "#B5840F" },
      { name: "Ink Black", hex: "#1E1E22", accent: "#111114" },
      { name: "Brick Red", hex: "#A8432F", accent: "#843322" },
    ],
    sizes: SIZES,
  },
  {
    id: "harbour-stripe-tee",
    name: "Harbour Stripe Tee",
    category: "tees",
    style: "tee",
    sleeve: "short",
    pattern: "stripes",
    price: 749,
    fabric: "Cotton jersey, 200 GSM",
    fit: "Relaxed fit",
    rating: 4.3,
    reviews: 618,
    tag: "New",
    description: "Classic sailor stripes with a slightly dropped shoulder. Inspired by the boats at Beypore harbour.",
    colours: [
      { name: "Navy / Cream", hex: "#F1ECE0", accent: "#1F2E55" },
      { name: "Red / White", hex: "#FAF7F2", accent: "#B3262E" },
      { name: "Olive / Sand", hex: "#E3D7BD", accent: "#5B6236" },
    ],
    sizes: SIZES,
  },
  {
    id: "malabar-check-shirt",
    name: "Malabar Check Shirt",
    category: "shirts",
    style: "shirt",
    sleeve: "long",
    pattern: "checks",
    price: 1299,
    mrp: 1599,
    fabric: "Handloom cotton",
    fit: "Slim fit",
    rating: 4.6,
    reviews: 903,
    tag: "Bestseller",
    description: "Handloom checks with a crisp collar and full button placket. Roll the sleeves up for the weekend.",
    colours: [
      { name: "Indigo Check", hex: "#2C3E6B", accent: "#8FA6D1" },
      { name: "Forest Check", hex: "#2F5134", accent: "#C9B98A" },
      { name: "Madras Red", hex: "#9E2B2B", accent: "#E8C35A" },
    ],
    sizes: SIZES,
  },
  {
    id: "linen-resort-shirt",
    name: "Linen Resort Shirt",
    category: "shirts",
    style: "shirt",
    sleeve: "short",
    pattern: "solid",
    price: 1499,
    fabric: "Pure linen",
    fit: "Relaxed fit",
    rating: 4.4,
    reviews: 377,
    description: "Airy linen with a camp collar, made for beach evenings at Kappad.",
    colours: [
      { name: "Sage", hex: "#9DB09A", accent: "#7F947C" },
      { name: "Sand", hex: "#D8C6A5", accent: "#BFAA85" },
      { name: "Sky", hex: "#9DC0DA", accent: "#7EA5C2" },
    ],
    sizes: SIZES,
  },
  {
    id: "festive-kurta",
    name: "Festive Kurta",
    category: "kurtas",
    style: "kurta",
    sleeve: "long",
    pattern: "dots",
    price: 1899,
    mrp: 2499,
    fabric: "Cotton-silk blend",
    fit: "Straight fit, knee length",
    rating: 4.7,
    reviews: 1188,
    tag: "Onam edit",
    description: "A knee-length kurta with a mandarin collar and fine buttis. Pair it with a mundu or straight trousers.",
    colours: [
      { name: "Kasavu Cream", hex: "#EFE4C8", accent: "#C9A04A" },
      { name: "Peacock Blue", hex: "#1D4E89", accent: "#E2C275" },
      { name: "Maroon", hex: "#6E1F2C", accent: "#E2C275" },
      { name: "Mint", hex: "#BFE0CF", accent: "#3E7C63" },
    ],
    sizes: SIZES,
  },
  {
    id: "weekend-hoodie",
    name: "Weekend Hoodie",
    category: "hoodies",
    style: "hoodie",
    sleeve: "long",
    pattern: "solid",
    price: 1699,
    fabric: "Brushed fleece, 320 GSM",
    fit: "Oversized fit",
    rating: 4.5,
    reviews: 842,
    description: "A heavyweight hoodie with a lined hood and kangaroo pocket, for air-conditioned offices and Munnar trips.",
    colours: [
      { name: "Heather Grey", hex: "#9A9CA1", accent: "#7C7E83" },
      { name: "Mustard", hex: "#C9922B", accent: "#A8771C" },
      { name: "Bottle Green", hex: "#25453A", accent: "#1A332A" },
      { name: "Lilac", hex: "#B9A6CF", accent: "#9C88B5" },
    ],
    sizes: SIZES,
  },
  {
    id: "denim-trucker-jacket",
    name: "Denim Trucker Jacket",
    category: "jackets",
    style: "jacket",
    sleeve: "long",
    pattern: "solid",
    price: 2499,
    mrp: 2999,
    fabric: "12 oz cotton denim",
    fit: "Regular fit",
    rating: 4.4,
    reviews: 456,
    description: "A classic trucker jacket with chest pockets and copper buttons. Wear it open over any tee.",
    colours: [
      { name: "Mid Wash", hex: "#4D6E9A", accent: "#B87333" },
      { name: "Dark Rinse", hex: "#26344F", accent: "#B87333" },
      { name: "Black", hex: "#2B2B2E", accent: "#9A9A9A" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    id: "polka-boxy-tee",
    name: "Polka Boxy Tee",
    category: "tees",
    style: "tee",
    sleeve: "short",
    pattern: "dots",
    price: 699,
    fabric: "Cotton slub",
    fit: "Boxy fit",
    rating: 4.2,
    reviews: 264,
    description: "A boxy, slightly cropped tee with playful polka dots. Looks great tucked into high-waist jeans.",
    colours: [
      { name: "Black / White", hex: "#1F1F23", accent: "#F4F1EA" },
      { name: "Pink / Red", hex: "#F3C6CF", accent: "#B3262E" },
      { name: "Yellow / Navy", hex: "#F2D16B", accent: "#1F2E55" },
    ],
    sizes: SIZES,
  },
];

export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id);

export const formatPrice = (n: number) => "₹" + n.toLocaleString("en-IN");
