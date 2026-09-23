/* Replace this module's state functions with API calls when a backend is connected. */
window.AdminData = (() => {
  const seed = {
    profile: { name: 'Pratyush Kumar', email: 'admin@code.io', role: 'Administrator', initials: 'PK' },
    projects: [
      { id: 1, name: 'Musicz', category: 'Product design', status: 'Published', updated: 'Today', image: 'assets/musicz-cover.png', description: 'A streaming experience made for discovery.' },
      { id: 2, name: 'CODE.IO', category: 'Brand & web', status: 'Published', updated: 'Sep 18', image: 'assets/CODE.IO.png', description: 'A digital home for a focused engineering studio.' },
      { id: 3, name: 'Cafe Folio', category: 'E-commerce', status: 'Draft', updated: 'Sep 12', image: 'assets/cafe.jpg', description: 'A warm, editorial ordering experience.' }
    ],
    team: [
      { id: 1, name: 'Pratyush', role: 'Founder', bio: 'Architecture and product thinking.', initials: 'PR' },
      { id: 2, name: 'Oggy', role: 'Frontend engineer', bio: 'UI, motion and performance.', initials: 'OG' },
      { id: 3, name: 'Shubham', role: 'Backend engineer', bio: 'APIs, data and infrastructure.', initials: 'SH' }
    ],
    messages: [
      { id: 1, name: 'Rahul Sharma', email: 'rahul@gmail.com', subject: 'Website Development Inquiry', preview: 'I wanted to ask about a website for our studio...', time: '10:42 AM', date: 'Today', status: 'Unread', initials: 'RS', thread: [{ from:'Rahul Sharma', time:'Today, 10:42 AM', text:'Hi CODE.IO, I wanted to ask about a website for our design studio. We are looking for a fast, editorial site with a simple CMS.' }] },
      { id: 2, name: 'Ananya Mehta', email: 'ananya@arc.co', subject: 'Portfolio Inquiry', preview: 'Could we discuss a product partnership?', time: 'Yesterday', date: 'Yesterday', status: 'Replied', initials: 'AM', thread: [{ from:'Ananya Mehta', time:'Yesterday, 2:14 PM', text:'Could we discuss a product partnership? I love the clarity of your recent work.' }, { from:'CODE.IO', time:'Yesterday, 4:03 PM', text:'Absolutely — thanks for reaching out. We would love to learn more about what you are building.' }] },
      { id: 3, name: 'Arjun Kapoor', email: 'arjun@north.co', subject: 'New project', preview: 'We have a small launch coming up in November.', time: 'Mon', date: 'Sep 15', status: 'Unread', initials: 'AK', thread: [{ from:'Arjun Kapoor', time:'Sep 15, 9:26 AM', text:'We have a small launch coming up in November and would like to explore working together.' }] }
    ],
    media: [{ id: 1, name:'musicz-cover.png', type:'Image', size:'1.8 MB', date:'Sep 20', image:'assets/musicz-cover.png' }, { id: 2, name:'hero.jpg', type:'Image', size:'2.4 MB', date:'Sep 18', image:'assets/hero.jpg' }, { id: 3, name:'project-brief.pdf', type:'Document', size:'840 KB', date:'Sep 12' }]
  };
  const key = 'codeio-admin-demo'; let state;
  try { state = JSON.parse(localStorage.getItem(key)) || seed; } catch { state = seed; }
  const save = () => localStorage.setItem(key, JSON.stringify(state));
  return { get: () => state, save, reset: () => { state = structuredClone(seed); save(); }, id: () => Date.now() };
})();
