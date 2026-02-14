mkdir -p app/admin
cat > app/admin/page.tsx << 'EOF'
"use client";

import React from 'react';
import AdminDashboard from '@/components/AdminDashboard';
import AdminPayroll from '@/components/AdminPayroll';

export default function AdminPage() {
  return (
    <div className="space-y-8 p-6 font-['Fredoka']">
      <AdminDashboard />
      <AdminPayroll />
    </div>
  );
}
EOF
