export default function DashboardHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome to the PropNetra Admin Control Center.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder cards for dashboard metrics */}
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Total Listings</p>
          <p className="text-3xl font-bold mt-2">1,245</p>
        </div>
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
          <p className="text-3xl font-bold mt-2 text-primary">32</p>
        </div>
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Active Brokers</p>
          <p className="text-3xl font-bold mt-2">840</p>
        </div>
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">System Alerts</p>
          <p className="text-3xl font-bold mt-2 text-green-500">All Clear</p>
        </div>
      </div>
    </div>
  );
}
