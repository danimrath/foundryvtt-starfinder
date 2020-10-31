export default function (engine) {
    engine.closures.add("calculateStarshipDrift", (fact, context) => {
        const data = fact.data;

        data.attributes.drift = CONFIG.SFRPG.driftEngineMap[data.details.systems.driftEngine] || 0;

        return fact;
    });
}