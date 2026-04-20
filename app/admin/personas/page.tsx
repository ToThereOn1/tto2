import { createAdminClient } from '@/lib/supabase/server';
import PersonasTable from '@/components/admin/PersonasTable';

export const dynamic = 'force-dynamic';

export default async function PersonasPage() {
    const supabase = createAdminClient();

    // Fetch personas with pet details
    const { data: personas, error } = await supabase
        .from('pet_personas')
        .select(`
            id,
            pet_id,
            created_at,
            persona_profile,
            pets (
                name,
                species,
                relationship
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                페르소나를 불러오는 중 오류가 발생했습니다: {error.message}
            </div>
        );
    }

    // Flatten pets array (Supabase join returns array even for 1:1 in JS)
    const formattedPersonas = (personas || []).map((p: any) => ({
        ...p,
        pets: Array.isArray(p.pets) ? p.pets[0] : p.pets
    }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">펫 페르소나 관리</h1>
                    <p className="text-slate-500 mt-1">
                        모든 펫의 AI 생성 페르소나를 확인합니다.
                    </p>
                </div>
            </div>

            <PersonasTable personas={formattedPersonas} />
        </div>
    );
}
