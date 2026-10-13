// Editable site content. Project photos/descriptions come from site-data.json (pulled from the original Houzz site).

export const site = {
  name: 'Interiors by JanLee',
  url: 'https://interiorsbyjanlee.com',
  phone: '(719) 930-5245',
  phoneHref: 'tel:+17199305245',
  email: 'interiorsbyjanlee@gmail.com',
  city: 'Colorado Springs',
  region: 'CO',
  founded: 2011,
  // Contact form delivery via FormSubmit (free, no account). The first submission triggers a one-time
  // "Activate form" email to this inbox; submissions are delivered after it is clicked.
  formEndpoint: 'https://formsubmit.co/ajax/interiorsbyjanlee@gmail.com',
  // Automatic confirmation emailed to the visitor (FormSubmit _autoresponse; plain text)
  autoresponse: 'Thank you for reaching out to Interiors by JanLee! We have received your consultation request, and JanLee will personally contact you within 1 business day to talk about your project. If you have anything to add in the meantime, simply reply to this email or call (719) 930-5245. We look forward to helping you create a home you love. Warmly, JanLee | Interiors by JanLee | Colorado Springs, CO | interiorsbyjanlee.com',
};

export const categories = [
  { id: 'living', label: 'Whole Home & Living' },
  { id: 'kitchen', label: 'Kitchens & Bars' },
  { id: 'bath', label: 'Baths & Laundry' },
  { id: 'bedroom', label: 'Bedrooms & Suites' },
  { id: 'commercial', label: 'Commercial' },
];

// Per-project extras keyed by Houzz project id: category, short card summary, and a description where the original had none.
export const projectMeta = {
  7726641: { cat: 'kitchen', summary: 'Sage cabinetry, Taj Mahal quartzite and a woven pendant.' },
  7333623: { cat: 'kitchen', summary: 'A sleek black-and-brass in-home bar built for hosting.' },
  7333632: { cat: 'bath', summary: 'Laundry room and office cove, layered with natural texture.' },
  7333643: { cat: 'bath', summary: 'A family heirloom red tub anchors an eclectic suite.' },
  7181082: { cat: 'living', summary: 'Bold navy, teal and mountain views in a whole-home refresh.',
    description: 'A whole-home design that steps confidently outside the box. Deep navy paneling, saturated teal and patterned textiles bring energy to every room, while generous windows keep the Colorado views front and center. Classic pieces sit alongside playful accents for a home that feels personal, collected and full of life.' },
  7123729: { cat: 'living', summary: 'Warm, layered rooms that feel like a retreat at home.',
    description: 'A suburban home reimagined as a personal oasis. Rich wall colors, statement lighting and a thoughtful mix of traditional and contemporary furnishings create rooms that feel warm, welcoming and easy to live in — from the formal dining room to the cozy gathering spaces.' },
  6204453: { cat: 'living', summary: 'A fresh start in Colorado with natural elements and color.' },
  6237737: { cat: 'bedroom', summary: 'Earthy master suite inspired by Colorado red rocks.' },
  2960302: { cat: 'living', cover: 27, summary: 'A mountaintop home of stone, wood, leather and color.' },
  2892639: { cat: 'living', summary: 'Blush, ivory and soft blues in a Rockrimmon makeover.' },
  1654311: { cat: 'bedroom', summary: 'Full master suite remodel with heirloom barn doors.' },
  2885029: { cat: 'bedroom', summary: 'A whimsical, gold-and-mauve bedroom for a young reader.' },
  2360604: { cat: 'living', summary: 'Dusty blues, plums and ivory in a light-filled Cordera home.' },
  2105141: { cat: 'living', summary: 'A 1970s condo with Roche Bobois pieces and original woodwork.' },
  2105221: { cat: 'living', summary: 'Rustic meets modern with bold color and texture.' },
  2661453: { cat: 'commercial', summary: 'Jungle wallpaper and vintage charm for a downtown salon.' },
  2274521: { cat: 'bedroom', summary: 'Dusty pink, gray and ivory with traditional grace.' },
  931451: { cat: 'living', summary: 'A dining hutch reborn as a home bar, amid color and pattern.' },
  814476: { cat: 'commercial', summary: 'Rustic glam salon with soft tones and statement lighting.' },
  798144: { cat: 'living', summary: 'Modern Havana style with a personal story in every room.' },
  959724: { cat: 'living', summary: 'A global-style mini makeover with big personality.',
    description: 'A global-style mini makeover proving that a few thoughtful moves can transform a room. Tufted seating, jewel-toned accents and layered art bring a well-traveled, personal feel to an everyday space.' },
  2145943: { cat: 'bedroom', summary: 'Coral, turquoise and florals in a cheerful guest room.',
    description: 'A guest bedroom that greets visitors with color. A coral four-poster bed, floral bedding and turquoise accents create a cheerful, welcoming retreat that still feels restful.' },
  931838: { cat: 'living', summary: 'Bright, open living with fresh pops of color.',
    description: 'Bright and spacious living. Soft neutrals and light-filled windows set the stage, while fresh greens, blues and artwork add personality across the open living, dining and fireplace areas.' },
  798192: { cat: 'commercial', summary: 'A characterful salon renovation in downtown Colorado Springs.',
    description: 'The renovation of Salon Waxafras, a characterful space in downtown Colorado Springs. Original architectural details were preserved and paired with rich color, vintage finds and eclectic décor for a salon that feels as unique as its clients.' },
  986878: { cat: 'bedroom', summary: 'An ocean wallpaper mural for an underwater-inspired room.',
    description: 'An ocean wallpaper mural turns this bedroom into an underwater escape. Deep blues and a bold coral-patterned bedspread complete the playful, immersive look.' },
  6238423: { cat: 'bedroom', summary: 'A surprise Christmas makeover for a 14-year-old.' },
  7333650: { cat: 'bath', summary: 'A hardworking laundry and bath with brass and marble.',
    description: 'A colorful laundry and bathroom combination that works as hard as it looks good. Deep cabinetry, marble-look counters, brass fixtures and open wood shelving make everyday chores feel a little more luxurious.' },
  7333644: { cat: 'living', summary: 'Stone, timber and jewel tones in a mountain living room.',
    description: 'Warm and inviting living in a home full of natural character. Red stone, exposed timber beams and leather seating are layered with jewel-toned pillows, soft throws and art for a space made for gathering by the fire.' },
  7726680: { cat: 'kitchen', summary: 'A navy island, brass pendants and an open, airy plan.',
    description: 'A timeless open kitchen centered on a deep navy island with a quartz waterfall top. Brushed-brass pendants and faucet, crisp white cabinetry and a patterned backsplash keep the space bright and classic, while the open plan connects cooking, dining and family life.' },
  7726671: { cat: 'bath', summary: 'Emerald cabinetry and indigo mosaic tile with brass.',
    description: 'A jewel-box bath of emerald green and indigo blue. Handmade-look mosaic tile wraps the walk-in shower, emerald cabinetry adds depth and brushed-brass hardware ties it all together for a bath that feels bold yet serene.' },
  7726658: { cat: 'bedroom', summary: 'Rosy walls, an iron bed and a bold graphic rug.',
    description: 'A rosy, relaxing guest room. Soft pink walls and vaulted ceilings set a calm tone, while a classic iron bed, warm wood pieces and a bold black-and-white graphic rug add character and contrast.' },
};

// Featured on the home page (in order)
export const featured = [7726641, 7726671, 7333623, 7181082, 7726680, 1654311, 2960302, 7333644];

export const services = [
  { id: 'interior-design', icon: 'sofa', title: 'Interior Design & Decorating', short: 'Personal, collected rooms that feel like you.',
    body: 'Whether it is a single room or an entire home, we design spaces that reflect your lifestyle. From color palettes and lighting to furniture, rugs, window treatments and accessories, every layer is chosen to work together — mixing colors, styles and patterns into something stunning.',
    img: ['calming-sophistication', 0] },
  { id: 'kitchen', icon: 'kitchen', title: 'Kitchen Renovations', short: 'Beautiful, functional kitchens built for living.',
    body: 'A kitchen is more than a stunning backsplash and gorgeous cabinets. We plan layouts, storage, surfaces and lighting so your kitchen is functional, easy to work in and a pleasure to live in — the heart of the home, designed around how you cook, gather and entertain.',
    img: ['calming-earthy-sage-green-kitchen', 3] },
  { id: 'bath', icon: 'bath', title: 'Bathroom Renovations', short: 'Spa-worthy baths with the right fixtures.',
    body: 'We all want a bathroom that reflects our personal style and delivers comfort. Just as important are the right fixtures and amenities — including accessible designs — that provide lasting function and value. We guide every tile, vanity and finish selection.',
    img: ['emerald-and-indigo-mosaic-bath', 0] },
  { id: 'remodeling', icon: 'plan', title: 'Home Remodeling', short: 'Full renovations, planned and coordinated.',
    body: 'There are many ways to update and modify your current home to fit your lifestyle and your vision. We handle space planning, material selections, project scheduling and coordination with our trusted network of contractors — so you don’t have to.',
    img: ['mountain-master-makeover', 0] },
  { id: 'color', icon: 'palette', title: 'Color Consultations', short: 'The perfect palette, chosen with confidence.',
    body: 'Color is one of the most powerful tools in design — and one of the hardest to choose. We help you select paint colors that work with your light, finishes and furnishings, creating a cohesive flow from room to room.',
    img: ['clean-living', 0] },
  { id: 'repurpose', icon: 'chair', title: 'Furniture Selection & Repurposing', short: 'Restoring the old while embracing the new.',
    body: 'From finding that perfect new piece to reviving a broken-down family heirloom, we love giving furniture a second life. A dated dresser becomes a classic black statement; an old hutch becomes a home bar. Your story stays in the room.',
    img: ['eclectic-charm-living', 0] },
  { id: 'commercial', icon: 'store', title: 'Commercial Spaces', short: 'Salons and businesses with character.',
    body: 'We bring the same personal approach to commercial interiors — creating salons and small business spaces full of character that make clients feel welcome the moment they walk in.',
    img: ['eclectic-salon-waxafras', 0] },
];

export const process = [
  { title: 'Listen', body: 'Every successful project begins with listening. We meet, walk your space and learn your goals, style and budget.' },
  { title: 'Design Plan', body: 'We develop a personalized design plan — layouts, palettes and the overall vision for your home.' },
  { title: 'Selections', body: 'We guide you through materials, finishes, furnishings, lighting and décor with confidence.' },
  { title: 'Coordinate & Reveal', body: 'We schedule and manage our trusted contractors and install every detail, on time and on budget.' },
];

export const faqs = [
  { q: 'How does a project with Interiors by JanLee begin?', a: 'Every project starts with a design consultation. We listen to your goals, review your space, style and budget, and then develop a personalized design plan to guide every decision.' },
  { q: 'Can you work with my existing furniture?', a: 'Absolutely. Restoring the old while embracing the new is our passion. We often repurpose and refinish existing pieces and family heirlooms, blending them with new selections so your home keeps its story.' },
  { q: 'Do you manage contractors and scheduling?', a: 'Yes. We coordinate a trusted network of contractors — painters, window covering experts, seamstresses, flooring and installation pros — and keep the project on schedule so you don’t have to manage it yourself.' },
  { q: 'Do you work within a budget?', a: 'Yes. Clients regularly tell us we delivered exactly what they wanted within their budget. We help you prioritize where to invest for the biggest impact.' },
  { q: 'Do you design commercial spaces?', a: 'We do. Alongside homes, we have designed and renovated salons and other small business spaces in Colorado Springs.' },
  { q: 'What areas do you serve?', a: 'We are based in Colorado Springs, Colorado, and work with homeowners throughout the Colorado Springs area. Contact us to discuss your location and project.' },
];

export const badges = [2024, 2023, 2021, 2019, 2018, 2017, 2016, 2015];
