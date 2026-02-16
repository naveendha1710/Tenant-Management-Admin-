
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const TenantApplicationForm = ({ unit, building, floor }) => {
    const [companyName, setCompanyName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleFileChange = (e) => {
        if (e.target.files) {
            setDocuments(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const documentPaths = [];
            for (const file of documents) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', file);
                uploadFormData.append('category', 'tenant-applications');
                
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadFormData
                });
                
                const result = await response.json();
                if (result.success) {
                    documentPaths.push(result.file.path);
                }
            }

            const { data, error } = await supabase
                .from('tenant_applications')
                .insert([
                    {
                        company_name: companyName,
                        contact_person: contactPerson,
                        email: email,
                        phone: phone,
                        building_id: building.id,
                        floor_id: floor.id,
                        unit_id: unit.id,
                        documents: documentPaths,
                    },
                ]);

            if (error) throw error;

            toast({ title: 'Application submitted successfully!' });
        } catch (error) {
            toast({ title: 'Error submitting application', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </div>
            <div>
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} required />
            </div>
            <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
                <Label>Space Requirement</Label>
                <Input value={`${building.name} - ${floor.name} - ${unit.name}`} disabled />
            </div>
            <div>
                <Label htmlFor="documents">Upload Documents (PDF, DOCX, Images)</Label>
                <Input id="documents" type="file" multiple onChange={handleFileChange} />
            </div>
            <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
        </form>
    );
};

export default TenantApplicationForm;
