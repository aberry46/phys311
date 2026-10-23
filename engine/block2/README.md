# PHYS 311: Block 2 Checkpoint
## Multi-Body Physics Engine Demonstration

### Overview

This project demonstrates a reusable Python physics engine developed throughout Block 2 of PHYS 311.

The simulation models four interacting bodies under gravity and spring forces, including elastic collisions. Conservation laws are used to evaluate the engine's numerical accuracy.

### Engine Architecture

The `block2_engine` package consists of:

- `body.py`: Defines bodies, positions, velocities, masses, and energy calculations.
- `forces.py`: Implements gravity, spring forces, and other force models.
- `collisions.py`: Detects and resolves collisions between circular bodies.
- `integrators.py`: Implements numerical integration methods.
- `world.py`: Coordinates bodies, forces, collisions, simulation time, and diagnostics.
- `__init__.py`: Exposes the engine components for import.

The engine is modular, allowing new forces or integrators to be added without restructuring the simulation.

### Simulation Configuration

- Bodies: 4
- Mass per body: 1.0 kg
- Radius per body: 0.20 m
- Forces: Gravity and springs
- Collision restitution: 1.0
- Integrator: Euler-Cromer
- Timestep: 0.001 s
- Simulation duration: 5.0 s

### Validation Results

The simulation produced the following results:

- Total collisions: 10
- Initial mechanical energy: 120.910 J
- Final mechanical energy: 120.002 J
- Maximum relative energy error: 0.751%
- Maximum horizontal momentum deviation: 0 kg m/s
- Final vertical momentum: -196.2 kg m/s

The energy results show relatively small numerical deviations, while momentum follows the expected behavior under gravity.

### Running the Simulation

1. Install Python with NumPy and Matplotlib.
2. Open `block2.ipynb` in Jupyter Notebook or VS Code.
3. Ensure `block2_engine` is located in the same folder as the notebook.
4. Run all notebook cells in order.
5. View the generated plots and conservation results.

The notebook saves its demonstration figures in the `figures` directory.

### Demonstration Figures

- `figures/block2_summary.png`: Trajectories, horizontal motion, energy error, and collisions.
- `figures/block2_snapshots.png`: Six snapshots showing the relative motion of the four-body system.

### Extensibility

New force models can be implemented by creating a subclass of the `Force` class and defining an `apply(world)` method. Conservative forces can additionally implement `potential_energy(world)`.

This modular structure allows the engine to be extended for future physics simulations.