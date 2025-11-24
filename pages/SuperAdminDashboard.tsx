
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { UserRole, Tenant, Package } from '../types';
import { getAllTenants, createTenant, updateTenantStatus, getPackages, createPackage } from '../services/mockDb';
import { Building, Plus, Lock, Unlock, Calendar, Package as BoxIcon, DollarSign } from 'lucide-react';

const SuperAdminDashboard: React.FC = () => {
    const [view, setView] = useState<'brands' | 'packages'>('brands');
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    
    // Modal States
    const [showBrandModal, setShowBrandModal] = useState(false);
    const [showPkgModal, setShowPkgModal] = useState(false);
    
    // Brand Form
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newPass, setNewPass] = useState('admin123');
    const [selectedPkg, setSelectedPkg] = useState('');

    // Package Form
    const [pkgName, setPkgName] = useState('');
    const [pkgPrice, setPkgPrice] = useState(0);
    const [pkgBranches, setPkgBranches] = useState(1);
    const [pkgDesc, setPkgDesc] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        getAllTenants().then(setTenants);
        getPackages().then(setPackages);
    };

    const handleCreateBrand = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await createTenant(newName, newPhone, newPass, selectedPkg);
        if (res.success) {
            setShowBrandModal(false);
            loadData();
            setNewName(''); setNewPhone('');
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

    return (
        <Layout role={UserRole.PLATFORM_ADMIN} title="ONIN Platform Management">
            <div className="flex space-x-4 mb-6 border-b border-gray-200 pb-1">
                <button onClick={() => setView('brands')} className={`px-4 py-2 font-bold ${view === 'brands' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'}`}>Thương Hiệu</button>
                <button onClick={() => setView('packages')} className={`px-4 py-2 font-bold ${view === 'packages' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'}`}>Gói Dịch Vụ</button>
            </div>

            {view === 'brands' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                         <h2 className="text-xl font-bold">Danh sách Khách Thuê ({tenants.length})</h2>
                         <button onClick={() => setShowBrandModal(true)} className="px-4 py-2 bg-brand-600 text-white rounded-lg flex items-center"><Plus size={16} className="mr-2"/> Tạo Mới</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tenants.map(t => (
                            <div key={t.id} className="p-4 bg-white rounded-xl shadow border">
                                <div className="flex justify-between">
                                    <div className="flex items-center">
                                        <Building className="text-gray-400 mr-3" size={24}/>
                                        <div>
                                            <h3 className="font-bold">{t.name}</h3>
                                            <p className="text-xs text-gray-500">Gói: {packages.find(p=>p.id===t.package_id)?.name || 'Mặc định'}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded font-bold ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.status}</span>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button onClick={() => toggleStatus(t)} className="text-sm font-bold text-gray-500 hover:text-brand-600 flex items-center">
                                        {t.status === 'active' ? <Lock size={14} className="mr-1"/> : <Unlock size={14} className="mr-1"/>}
                                        {t.status === 'active' ? 'Khóa' : 'Mở'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'packages' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                         <h2 className="text-xl font-bold">Gói Phần Mềm ({packages.length})</h2>
                         <button onClick={() => setShowPkgModal(true)} className="px-4 py-2 bg-brand-600 text-white rounded-lg flex items-center"><Plus size={16} className="mr-2"/> Tạo Gói</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {packages.map(p => (
                            <div key={p.id} className="p-6 bg-white rounded-xl shadow border text-center hover:shadow-lg transition-shadow">
                                <h3 className="font-bold text-lg text-brand-600">{p.name}</h3>
                                <div className="text-3xl font-bold my-4">{p.price.toLocaleString()}đ</div>
                                <p className="text-gray-500 text-sm mb-4">{p.description}</p>
                                <div className="bg-gray-50 p-2 rounded text-sm text-gray-700 font-medium">Tối đa {p.max_branches} chi nhánh</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modals */}
            {showBrandModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md">
                        <h3 className="font-bold text-lg mb-4">Thêm Thương Hiệu</h3>
                        <form onSubmit={handleCreateBrand} className="space-y-3">
                            <input className="w-full p-2 border rounded" placeholder="Tên thương hiệu" value={newName} onChange={e=>setNewName(e.target.value)} required />
                            <input className="w-full p-2 border rounded" placeholder="SĐT Chủ sở hữu" value={newPhone} onChange={e=>setNewPhone(e.target.value)} required />
                            <select className="w-full p-2 border rounded" value={selectedPkg} onChange={e=>setSelectedPkg(e.target.value)} required>
                                <option value="">Chọn gói dịch vụ</option>
                                {packages.map(p => <option key={p.id} value={p.id}>{p.name} - {p.price.toLocaleString()}đ</option>)}
                            </select>
                            <div className="flex justify-end pt-4 gap-2">
                                <button type="button" onClick={() => setShowBrandModal(false)} className="px-4 py-2 bg-gray-200 rounded">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded">Tạo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

             {showPkgModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md">
                        <h3 className="font-bold text-lg mb-4">Tạo Gói Dịch Vụ</h3>
                        <form onSubmit={handleCreatePackage} className="space-y-3">
                            <input className="w-full p-2 border rounded" placeholder="Tên gói" value={pkgName} onChange={e=>setPkgName(e.target.value)} required />
                            <input type="number" className="w-full p-2 border rounded" placeholder="Giá (VND)" value={pkgPrice} onChange={e=>setPkgPrice(Number(e.target.value))} required />
                            <input type="number" className="w-full p-2 border rounded" placeholder="Số chi nhánh tối đa" value={pkgBranches} onChange={e=>setPkgBranches(Number(e.target.value))} required />
                            <textarea className="w-full p-2 border rounded" placeholder="Mô tả" value={pkgDesc} onChange={e=>setPkgDesc(e.target.value)} />
                            <div className="flex justify-end pt-4 gap-2">
                                <button type="button" onClick={() => setShowPkgModal(false)} className="px-4 py-2 bg-gray-200 rounded">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};
export default SuperAdminDashboard;
