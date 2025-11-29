
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { UserRole, Tenant, Package, AuditLog, PlatformStats } from '../types';
import { getAllTenants, createTenant, updateTenantStatus, getPackages, createPackage, getAuditLogs, adminDeleteTenant, adminUpdateTenant, getPlatformStats } from '../services/mockDb';
import { Building, Plus, Lock, Unlock, Package as BoxIcon, Edit, Trash2, Save, FileText, CreditCard, LayoutDashboard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { VIETNAM_PROVINCES } from '../services/vietnamProvinces';

const SuperAdminDashboard: React.FC = () => {
    const [view, setView] = useState<'overview' | 'brands' | 'packages' | 'billing'>('overview');
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    const [stats, setStats] = useState<PlatformStats | null>(null);
    
    // Modal States
    const [showBrandModal, setShowBrandModal] = useState(false);
    const [showPkgModal, setShowPkgModal] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [editName, setEditName] = useState('');
    
    // Brand Form
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newPass, setNewPass] = useState('admin123');
    const [selectedPkg, setSelectedPkg] = useState('');
    const [selectedCity, setSelectedCity] = useState(VIETNAM_PROVINCES[0]);
    const [newAddress, setNewAddress] = useState('');

    // Package Form
    const [pkgName, setPkgName] = useState('');
    const [pkgPrice, setPkgPrice] = useState(0);
    const [pkgBranches, setPkgBranches] = useState(1);
    const [pkgDesc, setPkgDesc] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const t = await getAllTenants();
        setTenants(t);
        getPackages().then(setPackages);
        getPlatformStats().then(setStats);
    };

    const handleCreateBrand = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await createTenant(newName, newPhone, newPass, selectedPkg, selectedCity, newAddress);
        if (res.success) {
            setShowBrandModal(false);
            loadData();
            setNewName(''); setNewPhone(''); setNewAddress('');
            alert('Tạo thương hiệu thành công!');
        } else {
            alert('Lỗi: ' + res.message);
        }
    };

    const handleCreatePackage = async (e: React.FormEvent) => {
        e.preventDefault();
        await createPackage({
            id: `pkg_${Date.now()}`, name: pkgName, price: pkgPrice, max_branches: pkgBranches, description: pkgDesc
        });
        setShowPkgModal(false);
        loadData();
    };

    const toggleStatus = async (t: Tenant) => {
        const newStatus = t.status === 'active' ? 'locked' : 'active';
        if(confirm(`Bạn có chắc muốn ${newStatus === 'locked' ? 'KHÓA' : 'MỞ'} thương hiệu này?`)) {
            await updateTenantStatus(t.id, newStatus);
            loadData();
        }
    };

    const handleDeleteTenant = async (id: string) => {
        if(confirm('CẢNH BÁO: Hành động này sẽ xóa toàn bộ dữ liệu của thương hiệu (User, Vé, Logs). Bạn chắc chứ?')) {
            await adminDeleteTenant(id);
            loadData();
        }
    };

    const handleEditTenant = (t: Tenant) => {
        setEditingTenant(t);
        setEditName(t.name);
    };

    const saveTenantName = async () => {
        if (editingTenant) {
            await adminUpdateTenant(editingTenant.id, { name: editName });
            setEditingTenant(null);
            loadData();
        }
    };

    return (
        <Layout role={UserRole.PLATFORM_ADMIN} title="ONIN Platform Management">
            {/* Navigation Tabs */}
            <div className="flex space-x-1 mb-6 border-b border-gray-200 overflow-x-auto">
                <button onClick={() => setView('overview')} className={`px-6 py-3 font-bold flex items-center whitespace-nowrap ${view === 'overview' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <LayoutDashboard size={18} className="mr-2"/> Tổng Quan
                </button>
                <button onClick={() => setView('brands')} className={`px-6 py-3 font-bold flex items-center whitespace-nowrap ${view === 'brands' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Building size={18} className="mr-2"/> Cơ sở
                </button>
                <button onClick={() => setView('packages')} className={`px-6 py-3 font-bold flex items-center whitespace-nowrap ${view === 'packages' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <BoxIcon size={18} className="mr-2"/> Gói Đăng Ký
                </button>
                <button onClick={() => setView('billing')} className={`px-6 py-3 font-bold flex items-center whitespace-nowrap ${view === 'billing' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <CreditCard size={18} className="mr-2"/> Billing
                </button>
            </div>

            {/* OVERVIEW TAB */}
            {view === 'overview' && stats && (
                <div className="animate-in fade-in space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-gray-500 text-sm font-bold uppercase mb-2">MRR (Doanh thu tháng)</h3>
                            <div className="text-3xl font-extrabold text-brand-600">{stats.mrr.toLocaleString()}đ</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-gray-500 text-sm font-bold uppercase mb-2">Tổng Cơ Sở</h3>
                            <div className="text-3xl font-extrabold text-blue-600">{stats.totalTenants}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-gray-500 text-sm font-bold uppercase mb-2">Tổng Hội Viên</h3>
                            <div className="text-3xl font-extrabold text-purple-600">{stats.totalMembers}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-gray-500 text-sm font-bold uppercase mb-2">Tổng Check-in</h3>
                            <div className="text-3xl font-extrabold text-orange-600">{stats.totalCheckins}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 uppercase tracking-wide">Phân bổ theo khu vực (Top 5)</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.topRegions} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                        <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px' }} />
                                        <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 uppercase tracking-wide">Tỷ lệ Churn Rate</h3>
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <div className="text-5xl font-extrabold text-gray-300">{stats.churnRate}%</div>
                                    <p className="text-gray-400 mt-2">Tỷ lệ rời bỏ (Tháng này)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BRANDS TAB (Detailed Table) */}
            {view === 'brands' && (
                <div className="animate-in fade-in">
                    <div className="flex justify-between items-center mb-4">
                         <h2 className="text-xl font-bold">Danh sách Cơ sở ({tenants.length})</h2>
                         <button onClick={() => setShowBrandModal(true)} className="px-4 py-2 bg-brand-600 text-white rounded-lg flex items-center shadow-lg font-bold"><Plus size={16} className="mr-2"/> Thêm Cơ Sở</button>
                    </div>
                    
                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">Tên Cơ Sở</th>
                                    <th className="p-4">Khu vực</th>
                                    <th className="p-4 text-center">Chi nhánh</th>
                                    <th className="p-4">Gói</th>
                                    <th className="p-4 text-center">Nhân viên</th>
                                    <th className="p-4 text-center">Số KH</th>
                                    <th className="p-4 text-center">Check-in</th>
                                    <th className="p-4 text-center">Trạng thái</th>
                                    <th className="p-4 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {tenants.map(t => {
                                    const pkg = packages.find(p => p.id === t.package_id);
                                    const isEditing = editingTenant?.id === t.id;
                                    return (
                                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-medium text-gray-900">
                                                {isEditing ? (
                                                    <div className="flex items-center">
                                                        <input 
                                                            className="border rounded p-1 text-sm mr-2 w-full" 
                                                            value={editName} 
                                                            onChange={e => setEditName(e.target.value)} 
                                                            autoFocus
                                                        />
                                                        <button onClick={saveTenantName} className="text-green-600"><Save size={16}/></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center">
                                                        <Building className="text-gray-300 mr-3" size={20}/>
                                                        <div>
                                                            <div>{t.name}</div>
                                                            <div className="text-xs text-gray-400">{t.address_detail}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-600">{t.city}</td>
                                            <td className="p-4 text-center font-bold text-gray-600">{t.stats?.branches || 0}</td>
                                            <td className="p-4">
                                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-100">
                                                    {pkg?.name || 'Basic'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">{t.stats?.staff || 0}</td>
                                            <td className="p-4 text-center">{t.stats?.customers || 0}</td>
                                            <td className="p-4 text-center font-mono">{t.stats?.checkins || 0}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 text-xs rounded-full font-bold ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {t.status === 'active' ? 'ACTIVE' : 'LOCKED'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleEditTenant(t)} title="Đổi tên" className="p-2 hover:bg-gray-100 rounded text-gray-500">
                                                        <Edit size={16}/>
                                                    </button>
                                                    <button onClick={() => toggleStatus(t)} title={t.status === 'active' ? 'Khóa' : 'Mở khóa'} className={`p-2 hover:bg-gray-100 rounded ${t.status === 'active' ? 'text-orange-500' : 'text-green-600'}`}>
                                                        {t.status === 'active' ? <Lock size={16}/> : <Unlock size={16}/>}
                                                    </button>
                                                    <button onClick={() => handleDeleteTenant(t.id)} title="Xóa Vĩnh Viễn" className="p-2 hover:bg-red-50 rounded text-red-500">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* PACKAGES TAB */}
            {view === 'packages' && (
                <div className="animate-in fade-in">
                    <div className="flex justify-between items-center mb-4">
                         <h2 className="text-xl font-bold">Gói Phần Mềm ({packages.length})</h2>
                         <button onClick={() => setShowPkgModal(true)} className="px-4 py-2 bg-brand-600 text-white rounded-lg flex items-center font-bold"><Plus size={16} className="mr-2"/> Tạo Gói</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {packages.map(p => (
                            <div key={p.id} className="p-6 bg-white rounded-xl shadow-sm border text-center hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-brand-500"></div>
                                <h3 className="font-bold text-lg text-gray-800">{p.name}</h3>
                                <div className="text-3xl font-extrabold text-brand-600 my-4">{p.price.toLocaleString()}đ<span className="text-sm font-normal text-gray-500">/tháng</span></div>
                                <p className="text-gray-500 text-sm mb-6 min-h-[40px]">{p.description}</p>
                                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 font-medium border border-gray-100">
                                    Tối đa {p.max_branches} chi nhánh
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* BILLING TAB */}
            {view === 'billing' && (
                <div className="animate-in fade-in">
                    <h2 className="text-xl font-bold mb-4">Hóa Đơn & Thanh Toán</h2>
                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 font-bold text-gray-600">
                                <tr>
                                    <th className="p-4">Cơ Sở</th>
                                    <th className="p-4">Gói</th>
                                    <th className="p-4">Ngày Hết Hạn</th>
                                    <th className="p-4 text-right">Số Tiền</th>
                                    <th className="p-4 text-center">Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {tenants.map(t => {
                                    const pkg = packages.find(p => p.id === t.package_id);
                                    return (
                                        <tr key={t.id}>
                                            <td className="p-4 font-bold">{t.name}</td>
                                            <td className="p-4">{pkg?.name}</td>
                                            <td className="p-4 text-gray-500">{new Date(t.subscription_end).toLocaleDateString('vi-VN')}</td>
                                            <td className="p-4 text-right font-mono">{(pkg?.price || 0).toLocaleString()}đ</td>
                                            <td className="p-4 text-center">
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Đã Thanh Toán</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showBrandModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md animate-in zoom-in-95">
                        <h3 className="font-bold text-lg mb-4">Thêm Cơ Sở Mới</h3>
                        <form onSubmit={handleCreateBrand} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tên Cơ Sở</label>
                                <input className="w-full p-2 border rounded" placeholder="VD: Yoga Center X" value={newName} onChange={e=>setNewName(e.target.value)} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Tỉnh / Thành</label>
                                    <select className="w-full p-2 border rounded" value={selectedCity} onChange={e=>setSelectedCity(e.target.value)}>
                                        {VIETNAM_PROVINCES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Chi tiết</label>
                                    <input className="w-full p-2 border rounded" placeholder="Số nhà, đường..." value={newAddress} onChange={e=>setNewAddress(e.target.value)} required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">SĐT Chủ Sở Hữu (Login)</label>
                                <input className="w-full p-2 border rounded" placeholder="09xxxx" value={newPhone} onChange={e=>setNewPhone(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Gói Đăng Ký</label>
                                <select className="w-full p-2 border rounded" value={selectedPkg} onChange={e=>setSelectedPkg(e.target.value)} required>
                                    <option value="">Chọn gói...</option>
                                    {packages.map(p => <option key={p.id} value={p.id}>{p.name} - {p.price.toLocaleString()}đ</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end pt-4 gap-2 border-t mt-4">
                                <button type="button" onClick={() => setShowBrandModal(false)} className="px-4 py-2 bg-gray-100 rounded font-bold hover:bg-gray-200">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded font-bold hover:bg-brand-700">Tạo Cơ Sở</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

             {showPkgModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md animate-in zoom-in-95">
                        <h3 className="font-bold text-lg mb-4">Tạo Gói Dịch Vụ</h3>
                        <form onSubmit={handleCreatePackage} className="space-y-4">
                            <input className="w-full p-2 border rounded" placeholder="Tên gói" value={pkgName} onChange={e=>setPkgName(e.target.value)} required />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" className="w-full p-2 border rounded" placeholder="Giá (VND)" value={pkgPrice} onChange={e=>setPkgPrice(Number(e.target.value))} required />
                                <input type="number" className="w-full p-2 border rounded" placeholder="Max Chi Nhánh" value={pkgBranches} onChange={e=>setPkgBranches(Number(e.target.value))} required />
                            </div>
                            <textarea className="w-full p-2 border rounded" placeholder="Mô tả" value={pkgDesc} onChange={e=>setPkgDesc(e.target.value)} />
                            <div className="flex justify-end pt-4 gap-2 border-t">
                                <button type="button" onClick={() => setShowPkgModal(false)} className="px-4 py-2 bg-gray-100 rounded font-bold">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded font-bold">Lưu Gói</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};
export default SuperAdminDashboard;
