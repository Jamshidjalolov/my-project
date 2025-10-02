import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import { type SelectBoxProps } from '../types';

function SelectBox({ users, selectedUser, setSelectedUser }: SelectBoxProps) {
    const handleChange = (event: SelectChangeEvent<number>) => {
        setSelectedUser(Number(event.target.value));
    };

    return (
        <Box className="mb-3" sx={{ maxWidth: "400px" }}>
            <FormControl fullWidth>
                <InputLabel id="demo-simple-select-label">Users</InputLabel>
                <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={selectedUser}
                    label="Users"
                    onChange={handleChange}
                >
                    <MenuItem value={0}>All</MenuItem>
                    {users.map((user) => (
                        <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box >
    )
}

export default SelectBox