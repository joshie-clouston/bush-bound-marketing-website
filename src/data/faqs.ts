export interface FAQ {
  slug: string;
  question: string;
  answer: string;
  authority: string;
  related: string[];
}

export const faqs: FAQ[] = [
  {
    slug: 'how-long-does-a-vehicle-fit-out-take',
    question: 'How long does a vehicle fit-out take?',
    answer: 'Most builds take 8-12 weeks from deposit paid. Your vehicle is only with us for the installation phase, not the whole build. We\'ll give you a clear timeline during the consultation.',
    authority: 'We\'ve completed over a dozen builds across Troop Carriers, 4WDs and vans. The timeline depends on complexity - a drawer and bed setup is much quicker than a full expedition build with power, water and kitchen. Your vehicle isn\'t sitting in the workshop the whole time - we build the cabinetry before you drop it off, so your downtime is minimal.',
    related: ['whats-included-in-the-3d-design', 'whats-the-deposit-and-payment-process', 'can-i-visit-the-workshop'],
  },
  {
    slug: 'what-area-do-you-service',
    question: 'What area do you service?',
    answer: 'All of Australia. Installation is done at our Gold Coast workshop, but we ship flat packs and fully built fit-outs Australia-wide. The only thing we can\'t ship is 12V batteries and electrical components due to shipping regulations, but the cabinetry and fit-out structure can go anywhere.',
    authority: 'Our workshop is on the Gold Coast, QLD. We\'ve shipped builds to customers across Queensland, New South Wales and Victoria. For remote customers, we design the fit-out in 3D, CNC-cut everything, and ship it flat-packed with detailed install instructions. Local customers drop their vehicle off and we handle the full install.',
    related: ['can-i-visit-the-workshop', 'how-long-does-a-vehicle-fit-out-take', 'do-you-provide-a-loaner-vehicle-during-the-build'],
  },
  {
    slug: 'whats-included-in-the-3d-design',
    question: 'What\'s included in the 3D design?',
    answer: 'Think of it as try-before-you-buy. You see your full fit-out in 3D - cabinetry, drawers, sleeping setup, kitchen, power and water placement - before we cut a single piece. It catches mistakes early and lets you tweak the layout until you\'re 100% happy.',
    authority: 'It\'s cheaper and faster to change a 3D model than a physical build, so you never end up saying "next time I\'d do it differently." Every customer gets to review and approve the design before we order materials. We use this process on every build because it eliminates surprises and means the final product matches exactly what you signed off on.',
    related: ['do-i-own-the-3d-designs', 'whats-the-deposit-and-payment-process', 'how-long-does-a-vehicle-fit-out-take'],
  },
  {
    slug: 'why-laminated-plywood-instead-of-aluminium',
    question: 'Why laminated plywood instead of aluminium?',
    answer: 'It\'s lighter than most people think, easier to work with, and absorbs vibrations instead of amplifying them, so no rattling on corrugations. Every piece is CNC-cut to millimetre precision, so the fit is perfect every time.',
    authority: 'Plywood gives a warmer, more liveable interior compared to metal. It\'s also easier to modify later if your setup changes. We use premium laminated plywood because it handles moisture, dust and heat better than raw timber, and the CNC cutting means every panel fits like it was made for your vehicle - because it was.',
    related: ['what-finishes-and-colours-are-available', 'can-i-remove-the-fit-out-without-damaging-my-vehicle', 'can-i-add-to-my-fit-out-later'],
  },
  {
    slug: 'what-finishes-and-colours-are-available',
    question: 'What finishes and colours are available?',
    answer: 'After your 3D design is approved, you choose from three finish levels. All Laminate - laminated plywood drawer fronts and tops in white, black, timber or green. Hybrid - laminated plywood drawer fronts with marine carpet tops and sliding bed. Full Carpet - marine carpet drawer fronts, tops, sliding bed and gull wings.',
    authority: 'Marine carpet comes in any colour - black, grey, beige and dark navy are the most popular. We can also do a raw plywood finish for the natural look. All exposed plywood surfaces are hand-lacquered as standard to prevent moisture damage. The finish you choose affects both the look and durability of your build, and we\'ll walk you through the options during the design process.',
    related: ['why-laminated-plywood-instead-of-aluminium', 'whats-included-in-the-3d-design', 'can-i-add-to-my-fit-out-later'],
  },
  {
    slug: 'can-i-remove-the-fit-out-without-damaging-my-vehicle',
    question: 'Can I remove the fit-out without damaging my vehicle?',
    answer: 'Yes. We use factory bolt holes wherever possible. If we need to add mounting points, we use rivnuts that are painted and rust-proofed before installation.',
    authority: 'Once the fit-out is removed, you\'re left with a few small holes that look like factory bolt holes - easy to cover with a bolt until you want the fit-out back in. This is important for resale value and means you can transfer the fit-out to a new vehicle or sell it separately. Many of our customers sell their fit-out with the old car and come back for a new build.',
    related: ['can-i-add-to-my-fit-out-later', 'why-laminated-plywood-instead-of-aluminium', 'do-you-offer-warranty-on-your-builds'],
  },
  {
    slug: 'whats-the-deposit-and-payment-process',
    question: 'What\'s the deposit and payment process?',
    answer: 'Three stages. A design deposit kicks off the 3D design process - that covers the labour to model your fit-out. Once you approve the design and commit to the build, there\'s a materials deposit. The remaining balance is paid on collection.',
    authority: 'This staged payment structure protects both sides. You only commit to the full build after seeing and approving the 3D design. The materials deposit covers ordering everything we need. And you don\'t pay the final balance until you\'ve inspected the finished build and you\'re satisfied. No surprises, no pressure.',
    related: ['whats-included-in-the-3d-design', 'how-long-does-a-vehicle-fit-out-take', 'do-i-own-the-3d-designs'],
  },
  {
    slug: 'do-i-own-the-3d-designs',
    question: 'Do I own the 3D designs?',
    answer: 'No. The design deposit covers the labour to design your fit-out. You get to view, review and approve the 3D model, but the design files remain Bush Bound\'s intellectual property. We don\'t sell or share 3D models.',
    authority: 'The 3D design process takes significant time and expertise. The deposit covers this work, and the designs are part of how we deliver precision builds. You see the design, approve every detail, and the final build matches it exactly. The files themselves stay with us.',
    related: ['whats-included-in-the-3d-design', 'whats-the-deposit-and-payment-process', 'can-i-add-to-my-fit-out-later'],
  },
  {
    slug: 'do-you-offer-warranty-on-your-builds',
    question: 'Do you offer warranty on your builds?',
    answer: '12-month warranty on all craftsmanship. Electrical components and appliances carry their manufacturer\'s warranty. If something isn\'t right, we\'ll sort it out.',
    authority: 'We stand behind every build we do. The 12-month warranty covers all workmanship - cabinetry, joints, fixtures, mounting. Electrical components like Victron (5-year warranty) and Bushman fridges (7-year warranty) are covered by their manufacturers. We use quality brands specifically so our customers have long-term support beyond our own warranty.',
    related: ['can-i-remove-the-fit-out-without-damaging-my-vehicle', 'why-laminated-plywood-instead-of-aluminium', 'can-i-add-to-my-fit-out-later'],
  },
  {
    slug: 'what-power-system-do-i-need',
    question: 'What power system do I need?',
    answer: 'Depends on how you travel. For weekend getaways, a 12V dual-battery system with 200Ah of lithium will cover you comfortably. If you want to run a coffee machine, microwave or air fryer, we offer inverter setups too.',
    authority: 'We specialise in 12V systems because they cover the vast majority of use cases. All electrical work across every build is done by a certified auto electrician, fully compliant and insurance-covered. We\'ll recommend the right setup based on what you actually want to power.',
    related: ['how-long-does-a-vehicle-fit-out-take', 'can-i-add-to-my-fit-out-later', 'do-you-offer-warranty-on-your-builds'],
  },
  {
    slug: 'can-i-add-to-my-fit-out-later',
    question: 'Can I add to my fit-out later?',
    answer: 'Yes. Small modifications and additions go through the same 3D design process and are quoted separately. For major changes, we normally recommend selling the existing fit-out and starting fresh with exactly what you want.',
    authority: 'Plenty of our customers sell their fit-out with the old car and come back for a new build. Because the fit-outs are removable, they hold their value well on the secondhand market. For smaller changes - adding a drawer, mounting a panel, swapping a component - we can usually turn those around quickly.',
    related: ['can-i-remove-the-fit-out-without-damaging-my-vehicle', 'whats-the-deposit-and-payment-process', 'do-you-offer-warranty-on-your-builds'],
  },
  {
    slug: 'do-you-provide-a-loaner-vehicle-during-the-build',
    question: 'Do you provide a loaner vehicle during the build?',
    answer: 'Not at the moment. For now, it works like a mechanic: you drop your vehicle off and pick it back up when the install is done.',
    authority: 'We\'re looking into making loaner vehicles available for our customers in the future. In the meantime, we minimise your downtime by building the cabinetry before you drop your vehicle off. Your car is only with us for the installation phase, not the entire build process.',
    related: ['how-long-does-a-vehicle-fit-out-take', 'what-area-do-you-service', 'can-i-visit-the-workshop'],
  },
  {
    slug: 'can-i-visit-the-workshop',
    question: 'Can I visit the workshop?',
    answer: 'Absolutely. Come see a build in progress, touch the materials, and chat through your ideas in person. Just give us a call to arrange a time.',
    authority: 'We\'re based on the Gold Coast, QLD. We encourage anyone considering a build to come in and see the quality firsthand. You can check out current builds in progress, feel the materials, and get a sense of how everything comes together. It\'s the best way to understand the difference between a Bush Bound build and an off-the-shelf setup.',
    related: ['what-area-do-you-service', 'how-long-does-a-vehicle-fit-out-take', 'whats-included-in-the-3d-design'],
  },
];

// Top 5 FAQs for homepage display
export const homepageFaqSlugs = [
  'how-long-does-a-vehicle-fit-out-take',
  'whats-included-in-the-3d-design',
  'whats-the-deposit-and-payment-process',
  'do-you-offer-warranty-on-your-builds',
  'what-area-do-you-service',
];
