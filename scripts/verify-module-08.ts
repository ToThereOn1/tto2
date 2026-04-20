import { createClient } from '@/lib/supabase/server'
import { generateStatusEvent } from '@/lib/event-generator'

async function checkSchema() {
    console.log("Checking 'pets' table schema...");
    const supabase = await createClient();
    // We can't easily check schema via client, but we can try to select the column
    const { data, error } = await supabase
        .from('pets')
        .select('visual_description')
        .limit(1);

    if (error) {
        console.error("❌ Schema Check Failed: 'visual_description' column might be missing.", error.message);
    } else {
        console.log("✅ Schema Check Passed: 'visual_description' column exists.");
    }
}

async function testEventGenerator() {
    console.log("\nTesting Event Generator (Dry Run)...");
    const mockPet = {
        name: "Buddy",
        species: "Dog",
        breed: "Golden Retriever",
        visualDescription: "A soft watercolor illustration of a Golden Retriever with a kind face and dark eyes."
    };
    const mockPersona = {
        core_personality: { summary: "Loyal and playful" }
    };

    try {
        const result = await generateStatusEvent(mockPet, mockPersona, 10, 'English', 'Test', undefined, true); // Premium=true
        console.log("✅ Event Generation Success (Premium):");
        console.log("Content:", result.content);
        console.log("Visual Prompt:", result.metadata?.visual_prompt);
        console.log("Image URL (Fake/Real):", result.imageUrl || "None (Expected if no API key)");
        console.log("Is Fake Blur:", result.isFakeBlur);

        const resultFree = await generateStatusEvent(mockPet, mockPersona, 10, 'English', 'Test', undefined, false); // Premium=false
        console.log("\n✅ Event Generation Success (Free):");
        console.log("Is Fake Blur:", resultFree.isFakeBlur);

    } catch (e) {
        console.error("❌ Event Generation Failed:", e);
    }
}

async function run() {
    await checkSchema();
    await testEventGenerator(); // Start this if you want to test logic (requires env vars)
}

run();
